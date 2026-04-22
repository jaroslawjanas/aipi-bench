"use client";

import ColorBadge from "./ColorBadge";
import type { ModelStats } from "@/lib/stats";

interface StatsTableProps {
  stats: ModelStats[];
  selectedKey?: string | null;
  onRowClick?: (key: string) => void;
  sortField?: string | null;
  sortDirection?: "asc" | "desc";
  onSort?: (field: string) => void;
}

function formatSeconds(ms: number | null): string {
  if (ms === null) return "—";
  return `${(ms / 1000).toFixed(2)}s`;
}

function entryKey(stats: ModelStats): string {
  return `${stats.provider}|${stats.model}`;
}

function SortIndicator({
  field,
  activeField,
  direction,
}: {
  field: string;
  activeField?: string | null;
  direction?: "asc" | "desc";
}) {
  if (activeField !== field) {
    return <span className="inline-block w-3 ml-1 text-muted/30 select-none">⇅</span>;
  }
  return (
    <span className="inline-block w-3 ml-1 text-accent-blue select-none">
      {direction === "asc" ? "▲" : "▼"}
    </span>
  );
}

export default function StatsTable({ stats, selectedKey, onRowClick, sortField, sortDirection, onSort }: StatsTableProps) {
  if (stats.length === 0) {
    return <p className="text-muted text-center py-8">No data yet. Waiting for benchmark results...</p>;
  }

  function headerClass(field: string): string {
    const base = "pb-3 pr-4 font-medium cursor-pointer select-none transition-colors hover:text-text-primary";
    if (sortField === field) return `${base} text-text-primary`;
    return base;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className={headerClass("provider")} onClick={() => onSort?.("provider")}>
              Provider <SortIndicator field="provider" activeField={sortField} direction={sortDirection} />
            </th>
            <th className={headerClass("model")} onClick={() => onSort?.("model")}>
              Model <SortIndicator field="model" activeField={sortField} direction={sortDirection} />
            </th>
            <th className={headerClass("overall")} onClick={() => onSort?.("overall")}>
              Overall % <SortIndicator field="overall" activeField={sortField} direction={sortDirection} />
            </th>
            <th className={headerClass("ttft")} onClick={() => onSort?.("ttft")}>
              TTFT <span className="text-muted text-xs font-normal">avg (med)</span>{" "}
              <SortIndicator field="ttft" activeField={sortField} direction={sortDirection} />
            </th>
            <th className={headerClass("tps")} onClick={() => onSort?.("tps")}>
              TPS <span className="text-muted text-xs font-normal">avg (med)</span>{" "}
              <SortIndicator field="tps" activeField={sortField} direction={sortDirection} />
            </th>
            <th className={headerClass("time")} onClick={() => onSort?.("time")}>
              Time <span className="text-muted text-xs font-normal">avg (med)</span>{" "}
              <SortIndicator field="time" activeField={sortField} direction={sortDirection} />
            </th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => {
            const key = entryKey(s);
            return (
              <tr
                key={key}
                className={`border-b border-border/50 cursor-pointer transition-colors ${
                  selectedKey === key ? "bg-accent-blue/10" : "hover:bg-bg-card/50"
                }`}
                onClick={() => onRowClick?.(key)}
              >
                <td className="py-3 pr-4 text-muted">{s.provider}</td>
                <td className="py-3 pr-4 font-medium text-accent-blue">{s.alias || s.model}</td>
                <td className="py-3 pr-4">
                  <ColorBadge value={s.overallPct} thresholds={{ green: 98, yellow: 95 }} invert suffix="%" />
                </td>
                <td className="py-3 pr-4">
                  {s.ttftAvgMs !== null ? (
                    <>
                      <ColorBadge value={s.ttftAvgMs / 1000} thresholds={{ green: 5, yellow: 10 }} formatter={(v) => `${v.toFixed(2)}s`} />{" "}
                      <span className="text-muted text-xs">({formatSeconds(s.ttftMedianMs)})</span>
                    </>
                  ) : "—"}
                </td>
                <td className="py-3 pr-4">
                  {s.tpsAvg !== null ? (
                    <>
                      <ColorBadge value={s.tpsAvg} thresholds={{ green: 40, yellow: 30 }} invert suffix=" t/s" />{" "}
                      <span className="text-muted text-xs">({s.tpsMedian !== null ? s.tpsMedian.toFixed(1) : "—"})</span>
                    </>
                  ) : "—"}
                </td>
                <td className="py-3">
                  {s.timeAvgMs !== null ? (
                    <>
                      <span className="font-mono">{formatSeconds(s.timeAvgMs)}</span>{" "}
                      <span className="text-muted text-xs">({formatSeconds(s.timeMedianMs)})</span>
                    </>
                  ) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
