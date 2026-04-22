import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeStats } from "@/lib/stats";

const PERIOD_MS: Record<string, number> = {
  "5hr": 5 * 60 * 60 * 1000,
  "24hr": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") || "5hr";

  if (period === "now") {
    const recent = await prisma.result.findMany({
      orderBy: { timestamp: "desc" },
      take: 500,
      select: {
        provider: true,
        model: true,
        alias: true,
        success: true,
        ttftMs: true,
        tps: true,
        totalTimeMs: true,
        timestamp: true,
      },
    });

    const seen = new Set<string>();
    const rows = [];
    for (const r of recent) {
      const key = `${r.provider}|${r.model}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push(r);
      }
    }

    const stats = computeStats(rows);
    const from = rows.length > 0 ? rows[rows.length - 1].timestamp.toISOString() : new Date().toISOString();
    return NextResponse.json({ period, from, to: new Date().toISOString(), models: stats });
  }

  const ms = PERIOD_MS[period];
  if (!ms) {
    return NextResponse.json({ error: "Invalid period. Use now, 5hr, 24hr, or 3d." }, { status: 400 });
  }

  const since = new Date(Date.now() - ms);
  const rows = await prisma.result.findMany({
    where: { timestamp: { gte: since } },
    select: {
      provider: true,
      model: true,
      alias: true,
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
