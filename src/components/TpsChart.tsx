"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from "recharts";

interface ChartDataPoint {
  timestamp: string;
  tps: number | null;
}

interface TpsChartProps {
  data: Record<string, ChartDataPoint[]>;
}

const COLORS = ["#58a6ff", "#3fb950", "#d29922", "#f85149", "#bc8cff", "#79c0ff"];

function safeKey(model: string) {
  return `series_${model.replace(/\./g, "_")}`;
}

export default function TpsChart({ data }: TpsChartProps) {
  const models = Object.keys(data);
  if (models.length === 0) return <p className="text-muted text-center py-4">No TPS data available</p>;

  const timestamps = new Set<string>();
  for (const model of models) {
    for (const point of data[model]) {
      timestamps.add(point.timestamp);
    }
  }
  const sortedTimestamps = [...timestamps].sort();
  const chartData = sortedTimestamps.map((ts) => {
    const point: Record<string, string | number | null> = { timestamp: ts };
    for (const model of models) {
      point[safeKey(model)] = null;
    }
    return point;
  });

  for (const model of models) {
    for (const point of data[model]) {
      const idx = sortedTimestamps.indexOf(point.timestamp);
      if (idx >= 0 && point.tps !== null) {
        (chartData[idx] as Record<string, unknown>)[safeKey(model)] = point.tps;
      }
    }
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-4">
      <h3 className="text-sm font-medium text-muted mb-3">TPS (tokens/sec)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(v) => new Date(String(v)).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            stroke="#8b949e"
            fontSize={12}
          />
          <YAxis stroke="#8b949e" fontSize={12} />
          <Tooltip
            contentStyle={{ backgroundColor: "#1c2128", border: "1px solid #30363d", borderRadius: "8px" }}
            labelFormatter={(v) => new Date(String(v)).toLocaleString()}
          />
          <Brush dataKey="timestamp" height={30} stroke="#58a6ff" tickFormatter={(v) => new Date(String(v)).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
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