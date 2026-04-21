import { runBenchmark } from "./runner";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";

let intervalId: ReturnType<typeof setInterval> | null = null;

async function runAllModels() {
  console.log(`[benchmarker] Running benchmark for models: ${config.models.join(", ")}`);

  for (const model of config.models) {
    const result = await runBenchmark(model);

    await prisma.result.create({
      data: {
        model,
        success: result.success,
        ttftMs: result.ttftMs,
        tps: result.tps,
        totalTimeMs: result.totalTimeMs,
        tokensGenerated: result.tokensGenerated,
        promptSent: result.promptSent,
        errorMessage: result.errorMessage,
      },
    });

    const status = result.success
      ? `TTFT=${result.ttftMs}ms TPS=${result.tps} Time=${result.totalTimeMs}ms`
      : `FAILED: ${result.errorMessage}`;

    console.log(`[benchmarker] ${model}: ${status}`);
  }
}

export function startScheduler() {
  // Immediate first run
  runAllModels().catch((err) =>
    console.error("[benchmarker] Error in initial run:", err)
  );

  // Schedule recurring runs
  intervalId = setInterval(() => {
    runAllModels().catch((err) =>
      console.error("[benchmarker] Error in scheduled run:", err)
    );
  }, config.interval);

  console.log(
    `[benchmarker] Scheduler started — interval: ${config.interval / 1000}s, models: ${config.models.join(", ")}`
  );
}

export function stopScheduler() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[benchmarker] Scheduler stopped");
  }
}

export { runAllModels };