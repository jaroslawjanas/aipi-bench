export interface ModelStats {
  model: string;
  totalRequests: number;
  successfulRequests: number;
  overallPct: number;
  ttftAvgMs: number | null;
  ttftMedianMs: number | null;
  tpsAvg: number | null;
  tpsMedian: number | null;
  timeAvgMs: number | null;
  timeMedianMs: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function computeStats(
  rows: Array<{
    model: string;
    success: boolean;
    ttftMs: number | null;
    tps: number | null;
    totalTimeMs: number | null;
  }>
): ModelStats[] {
  const byModel = new Map<string, typeof rows>();

  for (const row of rows) {
    const existing = byModel.get(row.model) || [];
    existing.push(row);
    byModel.set(row.model, existing);
  }

  const stats: ModelStats[] = [];

  for (const [model, modelRows] of byModel) {
    const totalRequests = modelRows.length;
    const successfulRequests = modelRows.filter((r) => r.success).length;
    const overallPct = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 10000) / 100 : 0;

    const successes = modelRows.filter((r) => r.success);
    const ttftValues = successes.map((r) => r.ttftMs!).filter((v): v is number => v !== null);
    const tpsValues = successes.map((r) => r.tps!).filter((v): v is number => v !== null);
    const timeValues = successes.map((r) => r.totalTimeMs!).filter((v): v is number => v !== null);

    const avg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

    stats.push({
      model,
      totalRequests,
      successfulRequests,
      overallPct,
      ttftAvgMs: avg(ttftValues),
      ttftMedianMs: median(ttftValues),
      tpsAvg: tpsValues.length > 0 ? Math.round((tpsValues.reduce((a, b) => a + b, 0) / tpsValues.length) * 10) / 10 : null,
      tpsMedian: tpsValues.length > 0 ? Math.round(median(tpsValues)! * 10) / 10 : null,
      timeAvgMs: avg(timeValues),
      timeMedianMs: median(timeValues),
    });
  }

  return stats;
}