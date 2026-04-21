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
  const [period, setPeriod] = useState("7d");
  const [stats, setStats] = useState<ModelStats[]>([]);
  const [chartData, setChartData] = useState<Record<string, Array<{ timestamp: string; ttft: number | null; tps: number | null; time: number | null }>>>({});
  const [loading, setLoading] = useState(true);

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
      setLoading(true);
      try {
        const res = await fetch(`/api/chart-data?period=${period}`);
        const data: ChartDataResponse = await res.json();
        setChartData(data.models);
      } catch (err) {
        console.error("Failed to fetch chart data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchChartData();
  }, [period]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">AIPI Bench</h1>
          <PeriodSelector period={period} onPeriodChange={setPeriod} />
        </div>

        <div className="bg-bg-card rounded-xl border border-border p-6 mb-6">
          <StatsTable stats={stats} />
        </div>

        {loading ? (
          <p className="text-muted text-center py-8">Loading charts...</p>
        ) : (
          <div className="space-y-6">
            <TtftChart data={Object.fromEntries(
              Object.entries(chartData).map(([model, points]) => [model, points.map((p) => ({ timestamp: p.timestamp, ttft: p.ttft }))])
            )} />
            <TpsChart data={Object.fromEntries(
              Object.entries(chartData).map(([model, points]) => [model, points.map((p) => ({ timestamp: p.timestamp, tps: p.tps }))])
            )} />
          </div>
        )}
      </div>
    </div>
  );
}