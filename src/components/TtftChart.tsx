"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from "recharts";

interface ChartDataPoint {
  timestamp: string;
  ttft: number | null;
}

interface TtftChartProps {
  data: Record<string, ChartDataPoint[]>;
}

const COLORS = ["#58a6ff", "#3fb950", "#d29922", "#f85149", "#bc8cff", "#79c0ff"];

export default function TtftChart({ data }: TtftChartProps) {
  const models = Object.keys(data);
  if (models.length === 0) return <p className="text-muted text-center py-4">No TTFT data available</p>;

  // Merge all model data into unified time-series with avg + median lines per model
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
      point[`${model}_avg`] = null;
      point[`${model}_median`] = null;
    }
    return point;
  });

  // For individual benchmark runs, avg == the value itself
  // We'd need bucketing for true avg/median differentiation, but for per-run data each point IS the value
  for (const model of models) {
    for (const point of data[model]) {
      const idx = sortedTimestamps.indexOf(point.timestamp);
      if (idx >= 0 && point.ttft !== null) {
        (chartData[idx] as Record<string, unknown>)[`${model}_avg`] = point.ttft;
        (chartData[idx] as Record<string, unknown>)[`${model}_median`] = point.ttft;
      }
    }
  }

  return (
    <div className="bg-bg-card rounded-xl border border-border p-4">
      <h3 className="text-sm font-medium text-muted mb-3">TTFT (ms)</h3>
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
          <Legend />
          <Brush dataKey="timestamp" height={30} stroke="#58a6ff" tickFormatter={(v) => new Date(String(v)).toLocaleDateString(undefined, { month: "short", day: "numeric" })} />
          {models.map((model, i) => (
            <Line
              key={`${model}_avg`}
              type="monotone"
              dataKey={`${model}_avg`}
              name={`${model} (avg)`}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              strokeWidth={2}
            />
          ))}
          {models.map((model, i) => (
            <Line
              key={`${model}_median`}
              type="monotone"
              dataKey={`${model}_median`}
              name={`${model} (median)`}
              stroke={COLORS[i % COLORS.length]}
              strokeDasharray="5 5"
              dot={false}
              strokeWidth={1}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}