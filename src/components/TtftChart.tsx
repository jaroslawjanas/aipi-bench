"use client";

import TimeSeriesChart from "./TimeSeriesChart";

interface ChartDataPoint {
  timestamp: string;
  ttft: number | null;
}

interface ModelInfo {
  alias: string | null;
  provider: string;
  model: string;
}

interface TtftChartProps {
  data: Record<string, ChartDataPoint[]>;
  modelInfo?: Record<string, ModelInfo>;
  period: string;
}

export default function TtftChart({ data, modelInfo, period }: TtftChartProps) {
  const mappedData: Record<string, Array<{ timestamp: string; value: number | null }>> = {};
  for (const model of Object.keys(data)) {
    mappedData[model] = data[model].map((p) => ({ timestamp: p.timestamp, value: p.ttft }));
  }

  return (
    <TimeSeriesChart
      data={mappedData}
      modelInfo={modelInfo}
      title="TTFT (s)"
      unit="s"
      decimals={2}
      period={period}
      valueTransform={(v) => v / 1000}
    />
  );
}
