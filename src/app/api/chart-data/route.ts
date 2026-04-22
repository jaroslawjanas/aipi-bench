import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PERIOD_MS: Record<string, number> = {
  "5hr": 5 * 60 * 60 * 1000,
  "24hr": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") || "5hr";

  if (period === "now") {
    const recent = await prisma.result.findMany({
      where: { success: true },
      orderBy: { timestamp: "desc" },
      take: 500,
      select: { provider: true, model: true, timestamp: true, ttftMs: true, tps: true, totalTimeMs: true },
    });

    const seen = new Set<string>();
    const results = [];
    for (const r of recent) {
      const key = `${r.provider}|${r.model}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(r);
      }
    }

    const byKey: Record<string, Array<{ timestamp: string; ttft: number | null; tps: number | null; time: number | null }>> = {};

    for (const r of results) {
      const key = `${r.provider}|${r.model}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push({
        timestamp: r.timestamp.toISOString(),
        ttft: r.ttftMs,
        tps: r.tps,
        time: r.totalTimeMs,
      });
    }

    const from = results.length > 0 ? results[results.length - 1].timestamp.toISOString() : new Date().toISOString();
    return NextResponse.json({ period, from, to: new Date().toISOString(), models: byKey });
  }

  const ms = PERIOD_MS[period];
  if (!ms) {
    return NextResponse.json({ error: "Invalid period. Use now, 5hr, 24hr, or 3d." }, { status: 400 });
  }

  const since = new Date(Date.now() - ms);
  const results = await prisma.result.findMany({
    where: { timestamp: { gte: since }, success: true },
    select: { provider: true, model: true, timestamp: true, ttftMs: true, tps: true, totalTimeMs: true },
    orderBy: { timestamp: "asc" },
  });

  const byKey: Record<string, Array<{ timestamp: string; ttft: number | null; tps: number | null; time: number | null }>> = {};

  for (const r of results) {
    const key = `${r.provider}|${r.model}`;
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push({
      timestamp: r.timestamp.toISOString(),
      ttft: r.ttftMs,
      tps: r.tps,
      time: r.totalTimeMs,
    });
  }

  return NextResponse.json({ period, from: since.toISOString(), to: new Date().toISOString(), models: byKey });
}
