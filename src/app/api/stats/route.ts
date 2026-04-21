import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeStats } from "@/lib/stats";

const PERIOD_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") || "24h";
  const ms = PERIOD_MS[period];
  if (!ms) {
    return NextResponse.json({ error: "Invalid period. Use 24h, 7d, or 30d." }, { status: 400 });
  }

  const since = new Date(Date.now() - ms);
  const rows = await prisma.result.findMany({
    where: { timestamp: { gte: since } },
    select: {
      model: true,
      success: true,
      ttftMs: true,
      tps: true,
      totalTimeMs: true,
    },
    orderBy: { timestamp: "asc" },
  });

  const stats = computeStats(rows);
  return NextResponse.json({ period, from: since.toISOString(), to: new Date().toISOString(), models: stats });
}