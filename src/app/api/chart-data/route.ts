import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PERIOD_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") || "7d";
  const ms = PERIOD_MS[period];
  if (!ms) {
    return NextResponse.json({ error: "Invalid period. Use 24h, 7d, or 30d." }, { status: 400 });
  }

  const since = new Date(Date.now() - ms);
  const results = await prisma.result.findMany({
    where: { timestamp: { gte: since }, success: true },
    select: { model: true, timestamp: true, ttftMs: true, tps: true, totalTimeMs: true },
    orderBy: { timestamp: "asc" },
  });

  const byModel: Record<string, Array<{ timestamp: string; ttft: number | null; tps: number | null; time: number | null }>> = {};

  for (const r of results) {
    if (!byModel[r.model]) byModel[r.model] = [];
    byModel[r.model].push({
      timestamp: r.timestamp.toISOString(),
      ttft: r.ttftMs,
      tps: r.tps,
      time: r.totalTimeMs,
    });
  }

  return NextResponse.json({ period, from: since.toISOString(), to: new Date().toISOString(), models: byModel });
}