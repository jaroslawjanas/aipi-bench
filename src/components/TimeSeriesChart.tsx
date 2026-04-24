"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from "recharts";

interface ChartDataPoint {
  timestamp: string;
  value: number | null;
}

interface ModelInfo {
  alias: string | null;
  provider: string;
  model: string;
}

interface TimeSeriesChartProps {
  data: Record<string, ChartDataPoint[]>;
  modelInfo?: Record<string, ModelInfo>;
  title: string;
  unit: string;
  decimals: number;
  period: string;
  valueTransform?: (v: number) => number;
}

const COLORS = ["#58a6ff", "#3fb950", "#d29922", "#f85149", "#bc8cff", "#79c0ff"];

function safeKey(model: string) {
  return `series_${model.replace(/\./g, "_")}`;
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  modelInfo?: Record<string, ModelInfo>;
  unit: string;
  decimals: number;
}

function ChartTooltip({ active, payload, label, modelInfo, unit, decimals }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const labelDate = typeof label === "number" ? new Date(label) : new Date(String(label));

  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-lg">
      <div className="mb-1 text-xs text-muted">{labelDate.toLocaleString()}</div>
      {payload.map((entry, index) => {
        const info = modelInfo?.[entry.name];
        const displayName = info?.alias || info?.model || entry.name;
        const provider = info?.provider;
        return (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <div className="flex-1">
              <div className="text-sm font-medium">{displayName}</div>
              {provider && <div className="text-xs text-muted">{provider}</div>}
            </div>
            <div className="text-sm font-medium">
              {entry.value !== null && entry.value !== undefined ? `${Number(entry.value).toFixed(decimals)}${unit}` : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getHourlyTicks(minTs: number, maxTs: number): number[] {
  const ticks: number[] = [];
  const start = new Date(minTs);
  start.setMinutes(0, 0, 0);
  if (start.getTime() < minTs) {
    start.setHours(start.getHours() + 1);
  }
  const current = new Date(start);
  while (current.getTime() <= maxTs) {
    ticks.push(current.getTime());
    current.setHours(current.getHours() + 1);
  }
  return ticks;
}

function getDailyTicks(minTs: number, maxTs: number): number[] {
  const ticks: number[] = [];
  const start = new Date(minTs);
  start.setHours(0, 0, 0, 0);
  if (start.getTime() < minTs) {
    start.setDate(start.getDate() + 1);
  }
  const current = new Date(start);
  while (current.getTime() <= maxTs) {
    ticks.push(current.getTime());
    current.setDate(current.getDate() + 1);
  }
  return ticks;
}

function formatTick(period: string, value: number): string {
  const date = new Date(value);
  if (period === "24hr") {
    const hours = String(date.getHours()).padStart(2, "0");
    return `${hours}:00`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TimeSeriesChart({ data, modelInfo, title, unit, decimals, period, valueTransform }: TimeSeriesChartProps) {
  const models = Object.keys(data);
  if (models.length === 0) return <p className="text-muted text-center py-4">No data available</p>;

  const timestamps = new Set<string>();
  for (const model of models) {
    for (const point of data[model]) {
      timestamps.add(point.timestamp);
    }
  }
  const sortedTimestamps = [...timestamps].sort();
  const sortedEpochMs = sortedTimestamps.map((ts) => new Date(ts).getTime());
  const minTs = sortedEpochMs[0];
  const maxTs = sortedEpochMs[sortedEpochMs.length - 1];

  const chartData = sortedEpochMs.map((epoch) => {
    const point: Record<string, number | null> = { timestamp: epoch };
    for (const model of models) {
      point[safeKey(model)] = null;
    }
    return point;
  });

  for (const model of models) {
    for (const point of data[model]) {
      const idx = sortedTimestamps.indexOf(point.timestamp);
      if (idx >= 0 && point.value !== null) {
        const transformed = valueTransform ? valueTransform(point.value) : point.value;
        (chartData[idx] as Record<string, unknown>)[safeKey(model)] = transformed;
      }
    }
  }

  const ticks = period === "24hr" ? getHourlyTicks(minTs, maxTs) : getDailyTicks(minTs, maxTs);
  const tickFormatter = (v: number) => formatTick(period, v);

  return (
    <div className="bg-bg-card rounded-xl border border-border p-4">
      <h3 className="text-sm font-medium text-muted mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            type="number"
            dataKey="timestamp"
            domain={["dataMin", "dataMax"]}
            ticks={ticks}
            tickFormatter={tickFormatter}
            stroke="#8b949e"
            fontSize={12}
          />
          <YAxis stroke="#8b949e" fontSize={12} />
          <Tooltip content={<ChartTooltip modelInfo={modelInfo} unit={unit} decimals={decimals} />} />
          <Brush dataKey="timestamp" height={30} stroke="#58a6ff" tickFormatter={tickFormatter} />
          {models.map((model, i) => (
            <Line
              key={safeKey(model)}
              type="monotone"
              dataKey={safeKey(model)}
              name={model}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
