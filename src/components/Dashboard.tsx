"use client";

import { useEffect, useState } from "react";
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

export default function Dashboard() {
  const [period, setPeriod] = useState("5hr");
  const [chartPeriod, setChartPeriod] = useState("5hr");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [stats, setStats] = useState<ModelStats[]>([]);
  const [chartData, setChartData] = useState<Record<string, Array<{ timestamp: string; ttft: number | null; tps: number | null; time: number | null }>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/stats?period=${period}`);
        const data: StatsResponse = await res.json();
        setStats(data.models);
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
      setChartPeriod(period);
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
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">AIPI Bench</h1>
          <PeriodSelector period={period} onPeriodChange={setPeriod} />
        </div>

        <div className="bg-bg-card rounded-xl border border-border p-6 mb-6">
          <StatsTable
            stats={stats}
            selectedKey={selectedKey}
            onRowClick={handleRowClick}
          />
        </div>

        {selectedKey ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{displayName}</h2>
              <PeriodSelector period={chartPeriod} onPeriodChange={setChartPeriod} />
            </div>
            {loading ? (
              <p className="text-muted text-center py-8">Loading charts...</p>
            ) : (
              <div className="space-y-6">
                <TpsChart data={Object.fromEntries(
                  Object.entries(filteredChartData).map(([key, points]) => [key, points.map((p) => ({ timestamp: p.timestamp, tps: p.tps }))])
                )} modelInfo={modelInfo} />
                <TtftChart data={Object.fromEntries(
                  Object.entries(filteredChartData).map(([key, points]) => [key, points.map((p) => ({ timestamp: p.timestamp, ttft: p.ttft }))])
                )} modelInfo={modelInfo} />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-bg-card rounded-xl border border-border p-12 text-center">
            <p className="text-muted text-lg mb-2">Select a model from the table to view detailed charts.</p>
            <p className="text-muted text-sm">Click on any row above to see TTFT and TPS graphs for that model.</p>
          </div>
        )}

        <footer className="mt-12 text-center">
          <a
            href="https://github.com/jaroslawjanas/aipi-bench"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-text-primary transition-colors"
          >
            <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.18.01 1.44 0 .21-.15.46-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
            View on GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}
