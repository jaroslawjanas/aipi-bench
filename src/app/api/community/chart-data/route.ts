import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PERIOD_MS: Record<string, number> = {
  "24hr": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") || "24hr";
  const ms = PERIOD_MS[period];
  if (!ms) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  const since = new Date(Date.now() - ms);
  const results = await prisma.communityResult.findMany({
    where: { timestamp: { gte: since } },
    select: { provider: true, model: true, timestamp: true, ttftMs: true, tps: true },
    orderBy: { timestamp: "asc" },
  });

  const byKey: Record<string, Array<{ timestamp: string; ttft: number | null; tps: number | null }>> = {};

  for (const r of results) {
    const key = `${r.provider}|${r.model.toLowerCase()}`;
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push({
      timestamp: r.timestamp.toISOString(),
      ttft: r.ttftMs,
      tps: r.tps,
    });
  }

  return NextResponse.json({ period, from: since.toISOString(), to: new Date().toISOString(), models: byKey });
}
