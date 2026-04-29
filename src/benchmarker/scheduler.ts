import { runBenchmark } from "./runner";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import type { ConfigEntry } from "@/lib/config";

interface ScheduleState {
  entry: ConfigEntry;
  nextRunAt: number;
  running: boolean;
}

interface BenchmarkStatus {
  running: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  runBy: "manual" | "scheduler" | null;
}

let tickId: ReturnType<typeof setInterval> | null = null;
const schedules = new Map<string, ScheduleState>();

const status: BenchmarkStatus = {
  running: false,
  startedAt: null,
  finishedAt: null,
  runBy: null,
};

function entryKey(entry: ConfigEntry): string {
  return `${entry.provider}|${entry.model}`;
}

function getInterval(entry: ConfigEntry): number {
  return entry.interval ?? config.interval;
}

async function runEntry(state: ScheduleState) {
  if (state.running) return;
  state.running = true;

  const entry = state.entry;

  try {
    const result = await runBenchmark(entry);

    await prisma.result.create({
      data: {
        provider: entry.provider,
        model: entry.model.toLowerCase(),
        alias: entry.alias,
        success: result.success,
        ttftMs: result.ttftMs,
        tps: result.tps,
        totalTimeMs: result.totalTimeMs,
        tokensGenerated: result.tokensGenerated,
        promptSent: result.promptSent,
        errorMessage: result.errorMessage,
      },
    });

    const logStatus = result.success
      ? `TTFT=${result.ttftMs}ms TPS=${result.tps} Time=${result.totalTimeMs}ms`
      : `FAILED: ${result.errorMessage}`;

    console.log(`[benchmarker] ${entry.provider}/${entry.model}: ${logStatus}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[benchmarker] Error running ${entry.provider}/${entry.model}:`, message);
  } finally {
    state.nextRunAt = Date.now() + getInterval(entry);
    state.running = false;
  }
}

async function tick() {
  const now = Date.now();
  const due: ScheduleState[] = [];

  for (const state of schedules.values()) {
    if (state.nextRunAt <= now && !state.running) {
      due.push(state);
    }
  }

  if (due.length === 0) return;

  const startedAt = Date.now();
  status.running = true;
  status.startedAt = startedAt;
  status.runBy = "scheduler";

  try {
    await Promise.allSettled(
      due.map((state) =>
        runEntry(state).catch((err) =>
          console.error(`[benchmarker] Error running ${state.entry.provider}/${state.entry.model}:`, err)
        )
      )
    );
  } finally {
    status.running = false;
    status.finishedAt = Date.now();
  }
}

export function getBenchmarkStatus(): Readonly<BenchmarkStatus> {
  return status;
}

export async function runAllModels(): Promise<{ started: boolean; reason?: string }> {
  if (status.running) {
    return { started: false, reason: "already_running" };
  }

  status.running = true;
  status.startedAt = Date.now();
  status.runBy = "manual";

  console.log(`[benchmarker] Running all ${config.entries.length} entries immediately`);

  try {
    for (const entry of config.entries) {
      const key = entryKey(entry);
      const state = schedules.get(key);
      if (state) {
        await runEntry(state);
      }
    }
    return { started: true };
  } finally {
    status.running = false;
    status.finishedAt = Date.now();
  }
}

export function startScheduler() {
  const now = Date.now();

  for (const entry of config.entries) {
    schedules.set(entryKey(entry), {
      entry,
      nextRunAt: now,
      running: false,
    });
  }

  // Determine tick interval: minimum entry interval, capped at 60s minimum
  const intervals = config.entries.map(getInterval);
  const minInterval = Math.min(...intervals);
  const tickInterval = Math.min(minInterval, 60000);

  tickId = setInterval(() => {
    tick().catch((err) =>
      console.error("[benchmarker] Error in scheduler tick:", err)
    );
  }, tickInterval);

  console.log(
    `[benchmarker] Scheduler started — tick: ${tickInterval / 1000}s, entries: ${config.entries.length}`
  );

  // Run initial tick immediately so entries fire on startup
  tick().catch((err) =>
    console.error("[benchmarker] Error in initial tick:", err)
  );
}

export function stopScheduler() {
  if (tickId !== null) {
    clearInterval(tickId);
    tickId = null;
    schedules.clear();
    console.log("[benchmarker] Scheduler stopped");
  }
}
