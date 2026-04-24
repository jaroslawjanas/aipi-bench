"use client";

import { useEffect, useMemo, useState } from "react";
import PeriodSelector from "./PeriodSelector";
import StatsTable from "./StatsTable";
import TtftChart from "./TtftChart";
import TpsChart from "./TpsChart";
import type { ModelStats } from "@/lib/stats";

interface StatsResponse {
  period: string;
  from: string;
  to: string;
  models: ModelStats[];
}

interface ChartDataResponse {
  period: string;
  from: string;
  to: string;
  models: Record<string, Array<{ timestamp: string; ttft: number | null; tps: number | null; time: number | null }>>;
}

const tablePeriods = [
  { value: "now", label: "Now" },
  { value: "5hr", label: "5hr" },
  { value: "24hr", label: "24hr" },
  { value: "3d", label: "3d" },
];

const chartPeriods = [
  { value: "24hr", label: "24hr" },
  { value: "3d", label: "3d" },
  { value: "7d", label: "7d" },
];

function sortStats(data: ModelStats[], field: string | null, direction: "asc" | "desc"): ModelStats[] {
  if (!field) return data;
  const dir = direction === "asc" ? 1 : -1;

  return [...data].sort((a, b) => {
    function getVal(s: ModelStats, f: string): number | string | null {
      switch (f) {
        case "provider": return s.provider;
        case "model": return s.alias || s.model;
        case "overall": return s.overallPct;
        case "ttft": return s.ttftAvgMs;
        case "tps": return s.tpsAvg;
        case "time": return s.timeAvgMs;
        default: return null;
      }
    }

    const aVal = getVal(a, field);
    const bVal = getVal(b, field);

    // Nulls always go to the end
    const aNull = aVal === null;
    const bNull = bVal === null;
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;

    let cmp = 0;
    if (typeof aVal === "string" && typeof bVal === "string") {
      cmp = aVal.localeCompare(bVal);
    } else if (typeof aVal === "number" && typeof bVal === "number") {
      cmp = aVal - bVal;
    }

    // Provider tie-breaker: sort by model
    if (field === "provider" && cmp === 0) {
      cmp = (a.alias || a.model).localeCompare(b.alias || b.model);
    }

    return cmp * dir;
  });
}

export default function Dashboard() {
  const [period, setPeriod] = useState("5hr");
  const [chartPeriod, setChartPeriod] = useState("24hr");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [rawStats, setRawStats] = useState<ModelStats[]>([]);
  const [chartData, setChartData] = useState<Record<string, Array<{ timestamp: string; ttft: number | null; tps: number | null; time: number | null }>>>({});
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const stats = useMemo(() => sortStats(rawStats, sortField, sortDirection), [rawStats, sortField, sortDirection]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      // Default directions: asc for text, desc for overall/tps (higher=better), asc for ttft/time (lower=better)
      if (field === "overall" || field === "tps") {
        setSortDirection("desc");
      } else {
        setSortDirection("asc");
      }
    }
  }

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/stats?period=${period}`);
        const data: StatsResponse = await res.json();
        setRawStats(data.models);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    }
    fetchStats();
  }, [period]);

  useEffect(() => {
    async function fetchChartData() {
      if (!selectedKey) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/chart-data?period=${chartPeriod}`);
        const data: ChartDataResponse = await res.json();
        setChartData(data.models);
      } catch (err) {
        console.error("Failed to fetch chart data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchChartData();
  }, [selectedKey, chartPeriod]);

  function handleRowClick(key: string) {
    if (selectedKey === key) {
      setSelectedKey(null);
    } else {
      const validChart = chartPeriods.map((p) => p.value);
      setChartPeriod(validChart.includes(period) ? period : "24hr");
      setSelectedKey(key);
    }
  }

  const selectedStat = stats.find((s) => `${s.provider}|${s.model}` === selectedKey);
  const displayName = selectedStat?.alias || selectedStat?.model || selectedKey || "";

  const filteredChartData = selectedKey
    ? { [selectedKey]: chartData[selectedKey] ?? [] }
    : {};

  const modelInfo = selectedStat && selectedKey
    ? { [selectedKey]: { alias: selectedStat.alias, provider: selectedStat.provider, model: selectedStat.model } }
    : undefined;

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div />
        <PeriodSelector period={period} onPeriodChange={setPeriod} periods={tablePeriods} />
      </div>

      <div className="bg-bg-card rounded-xl border border-border p-6 mb-6">
          <StatsTable
            stats={stats}
            selectedKey={selectedKey}
            onRowClick={handleRowClick}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </div>

        {selectedKey ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{displayName}</h2>
              <PeriodSelector period={chartPeriod} onPeriodChange={setChartPeriod} periods={chartPeriods} />
            </div>
            {loading ? (
              <p className="text-muted text-center py-8">Loading charts...</p>
            ) : (
              <div className="space-y-6">
                <TpsChart data={Object.fromEntries(
                  Object.entries(filteredChartData).map(([key, points]) => [key, points.map((p) => ({ timestamp: p.timestamp, tps: p.tps }))])
                )} modelInfo={modelInfo} period={chartPeriod} />
                <TtftChart data={Object.fromEntries(
                  Object.entries(filteredChartData).map(([key, points]) => [key, points.map((p) => ({ timestamp: p.timestamp, ttft: p.ttft }))])
                )} modelInfo={modelInfo} period={chartPeriod} />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-bg-card rounded-xl border border-border p-12 text-center">
            <p className="text-muted text-lg mb-2">Select a model from the table to view detailed charts.</p>
            <p className="text-muted text-sm">Click on any row above to see TTFT and TPS graphs for that model.</p>
          </div>
        )}

        <footer className="mt-12 flex items-center justify-center gap-4">
          <a
            href="https://github.com/jaroslawjanas/aipi-bench"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-text-primary transition-colors"
          >
            <img src="/github-logo.png" alt="GitHub" className="h-4 w-4" />
            View on GitHub
          </a>
          <span className="text-muted/30">|</span>
          <a
            href="https://discord.gg/ZmUAPPkymV"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-text-primary transition-colors"
          >
            <img src="/discord-logo.png" alt="Discord" className="h-4 w-4" />
            Join Discord
          </a>
          <span className="text-muted/30">|</span>
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-text-primary transition-colors"
          >
            Log In
          </a>
        </footer>
    </>
  );
}
