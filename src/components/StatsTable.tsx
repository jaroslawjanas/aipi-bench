"use client";

import ColorBadge from "./ColorBadge";
import type { ModelStats } from "@/lib/stats";

interface StatsTableProps {
  stats: ModelStats[];
}

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function StatsTable({ stats }: StatsTableProps) {
  if (stats.length === 0) {
    return <p className="text-muted text-center py-8">No data yet. Waiting for benchmark results...</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="pb-3 pr-4 font-medium">Model</th>
            <th className="pb-3 pr-4 font-medium">Overall %</th>
            <th className="pb-3 pr-4 font-medium">TTFT</th>
            <th className="pb-3 pr-4 font-medium">TPS</th>
            <th className="pb-3 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.model} className="border-b border-border/50 hover:bg-bg-card/50">
              <td className="py-3 pr-4 font-medium text-accent-blue">{s.model}</td>
              <td className="py-3 pr-4">
                <ColorBadge value={s.overallPct} thresholds={{ green: 99, yellow: 95 }} invert suffix="%" />
              </td>
              <td className="py-3 pr-4">
                {s.ttftAvgMs !== null ? (
                  <>
                    <ColorBadge value={s.ttftAvgMs} thresholds={{ green: 500, yellow: 2000 }} suffix="ms" />{" "}
                    <span className="text-muted text-xs">({formatMs(s.ttftMedianMs)})</span>
                  </>
                ) : "—"}
              </td>
              <td className="py-3 pr-4">
                {s.tpsAvg !== null ? (
                  <>
                    <ColorBadge value={s.tpsAvg} thresholds={{ green: 30, yellow: 10 }} invert suffix=" t/s" />{" "}
                    <span className="text-muted text-xs">({s.tpsMedian})</span>
                  </>
                ) : "—"}
              </td>
              <td className="py-3">
                {s.timeAvgMs !== null ? (
                  <>
                    <ColorBadge value={s.timeAvgMs} thresholds={{ green: 10000, yellow: 30000 }} suffix="ms" />{" "}
                    <span className="text-muted text-xs">({formatMs(s.timeMedianMs)})</span>
                  </>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}