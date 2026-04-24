"use client";

import { useEffect, useMemo, useState } from "react";
import PeriodSelector from "./PeriodSelector";
import CommunityStatsTable from "./CommunityStatsTable";
import TtftChart from "./TtftChart";
import TpsChart from "./TpsChart";
import type { ModelStats } from "@/lib/stats";
import type { CommunityProvider } from "@/lib/config";

interface CommunityConfigResponse {
  prompt: string;
  providers: CommunityProvider[];
}

interface CommunityStatsResponse {
  period: string;
  from: string;
  to: string;
  models: ModelStats[];
}

interface CommunityChartDataResponse {
  period: string;
  from: string;
  to: string;
  models: Record<string, Array<{ timestamp: string; ttft: number | null; tps: number | null }>>;
}

const communityPeriods = [
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
        case "ttft": return s.ttftAvgMs;
        case "tps": return s.tpsAvg;
        case "runs": return s.totalRequests;
        default: return null;
      }
    }

    const aVal = getVal(a, field);
    const bVal = getVal(b, field);

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

    if (field === "provider" && cmp === 0) {
      cmp = (a.alias || a.model).localeCompare(b.alias || b.model);
    }

    return cmp * dir;
  });
}

export default function CommunityBench() {
  const [providers, setProviders] = useState<CommunityProvider[]>([]);
  const [prompt, setPrompt] = useState<string>("");
  const [period, setPeriod] = useState<string>("5hr");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [showContribute, setShowContribute] = useState(false);
  const [contributeLoading, setContributeLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ ttftMs: number; tps: number } | null>(null);
  const [contributeError, setContributeError] = useState<string | null>(null);

  const [rawStats, setRawStats] = useState<ModelStats[]>([]);
  const [chartPeriod, setChartPeriod] = useState<string>("24hr");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [chartData, setChartData] = useState<Record<string, Array<{ timestamp: string; ttft: number | null; tps: number | null }>>>({});
  const [chartLoading, setChartLoading] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const stats = useMemo(() => sortStats(rawStats, sortField, sortDirection), [rawStats, sortField, sortDirection]);

  const availableModels = providers.find((p) => p.provider === selectedProvider)?.models || [];

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/community/config");
        const data: CommunityConfigResponse = await res.json();
        setPrompt(data.prompt);
        setProviders(data.providers);
      } catch (err) {
        console.error("Failed to fetch community config:", err);
      }
    }
    fetchConfig();
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`/api/community/stats?period=${period}`);
        const data: CommunityStatsResponse = await res.json();
        setRawStats(data.models);
      } catch (err) {
        console.error("Failed to fetch community stats:", err);
      }
    }
    fetchStats();
  }, [period]);

  useEffect(() => {
    async function fetchChartData() {
      if (!selectedKey) return;
      setChartLoading(true);
      try {
        const res = await fetch(`/api/community/chart-data?period=${chartPeriod}`);
        const data: CommunityChartDataResponse = await res.json();
        setChartData(data.models);
      } catch (err) {
        console.error("Failed to fetch community chart data:", err);
      } finally {
        setChartLoading(false);
      }
    }
    fetchChartData();
  }, [selectedKey, chartPeriod]);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      if (field === "tps" || field === "runs") {
        setSortDirection("desc");
      } else {
        setSortDirection("asc");
      }
    }
  }

  function handleRowClick(key: string) {
    if (selectedKey === key) {
      setSelectedKey(null);
    } else {
      const validChart = chartPeriods.map((p) => p.value);
      setChartPeriod(validChart.includes(period) ? period : "24hr");
      setSelectedKey(key);
    }
  }

  async function handleRunBenchmark() {
    setContributeLoading(true);
    setContributeError(null);
    setLastResult(null);

    try {
      const res = await fetch("/api/community/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, model: selectedModel, apiKey }),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = "Benchmark failed";
        try {
          const parsed = JSON.parse(text);
          message = parsed.data?.message || parsed.error || message;
        } catch {
          message = text || message;
        }
        setContributeError(message);
        setContributeLoading(false);
        return;
      }

      if (!res.body) {
        setContributeError("No response body");
        setContributeLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: { ttftMs: number; tps: number } | null = null;
      let errorMessage: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.event === "result") {
              const data = parsed.data;
              if (data.success) {
                finalResult = { ttftMs: data.ttftMs, tps: data.tps };
              } else {
                errorMessage = data.errorMessage || "Benchmark failed";
              }
            } else if (parsed.event === "error") {
              errorMessage = parsed.data?.message || "Benchmark failed";
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      if (errorMessage) {
        setContributeError(errorMessage);
      } else if (finalResult) {
        setLastResult(finalResult);
        // Refresh stats
        const statsRes = await fetch(`/api/community/stats?period=${period}`);
        const statsData: CommunityStatsResponse = await statsRes.json();
        setRawStats(statsData.models);
      } else {
        setContributeError("No result received");
      }
    } catch (err) {
      setContributeError("Network error. Please try again.");
    } finally {
      setContributeLoading(false);
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
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Community Benchmarks</h2>
        <PeriodSelector period={period} onPeriodChange={setPeriod} periods={communityPeriods} />
      </div>

      {/* Contribute button */}
      <div>
        <button
          onClick={() => setShowContribute((prev) => !prev)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer
            ${showContribute
              ? "bg-border text-text-primary"
              : "bg-accent-blue text-white hover:bg-accent-blue/90"
            }`}
        >
          {showContribute ? "Cancel" : "Contribute"}
        </button>
      </div>

      {/* Contribute form */}
      {showContribute && (
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <div className="space-y-4">
            {/* Info banner */}
            <div className="bg-bg-primary rounded-lg border border-border p-4 text-sm">
              <p className="text-text-primary mb-2">
                Your API key is sent securely via HTTPS and is never stored or logged by our server.
                It exists only in memory for the duration of the benchmark run.
              </p>
              <p className="text-muted">
                <span className="font-medium text-text-primary">Prompt:</span> {prompt || "You are a short-story writer. Write a compelling 2,000-word story with a clear conflict and emotional ending."}
              </p>
            </div>

            {/* Provider dropdown */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setSelectedModel("");
                }}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue [color-scheme:dark]"
              >
                <option style={{ backgroundColor: "#0d1117", color: "#e6edf3" }} value="">Select provider...</option>
                {providers.map((p) => (
                  <option style={{ backgroundColor: "#0d1117", color: "#e6edf3" }} key={p.provider} value={p.provider}>{p.provider}</option>
                ))}
              </select>
            </div>

            {/* Model dropdown */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!selectedProvider}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue disabled:opacity-50 [color-scheme:dark]"
              >
                <option style={{ backgroundColor: "#0d1117", color: "#e6edf3" }} value="">Select model...</option>
                {availableModels.map((m) => (
                  <option style={{ backgroundColor: "#0d1117", color: "#e6edf3" }} key={m.model} value={m.model}>{m.alias || m.model}</option>
                ))}
              </select>
            </div>

            {/* API Key input */}
            <div>
              <label className="block text-sm font-medium text-muted mb-1">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
              />
            </div>

            {/* Run button */}
            <button
              onClick={handleRunBenchmark}
              disabled={!selectedProvider || !selectedModel || !apiKey || contributeLoading}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer
                bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {contributeLoading ? "Running benchmark..." : "Run Benchmark"}
            </button>

            {/* Result card */}
            {lastResult && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400 font-medium mb-2">Result submitted!</p>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted">TTFT:</span>{" "}
                    <span className="font-medium">{`${(lastResult.ttftMs / 1000).toFixed(2)}s`}</span>
                  </div>
                  <div>
                    <span className="text-muted">TPS:</span>{" "}
                    <span className="font-medium">{`${lastResult.tps.toFixed(1)} t/s`}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error card */}
            {contributeError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
                {contributeError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats table */}
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <CommunityStatsTable
          stats={stats}
          selectedKey={selectedKey}
          onRowClick={handleRowClick}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      </div>

      {/* Charts */}
      {selectedKey ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{displayName}</h2>
            <PeriodSelector period={chartPeriod} onPeriodChange={setChartPeriod} periods={chartPeriods} />
          </div>
          {chartLoading ? (
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
      </footer>
    </div>
  );
}
