"use client";

import TimeSeriesChart from "./TimeSeriesChart";

interface ChartDataPoint {
  timestamp: string;
  tps: number | null;
}

interface ModelInfo {
  alias: string | null;
  provider: string;
  model: string;
}

interface TpsChartProps {
  data: Record<string, ChartDataPoint[]>;
  modelInfo?: Record<string, ModelInfo>;
  period: string;
}

export default function TpsChart({ data, modelInfo, period }: TpsChartProps) {
  const mappedData: Record<string, Array<{ timestamp: string; value: number | null }>> = {};
  for (const model of Object.keys(data)) {
    mappedData[model] = data[model].map((p) => ({ timestamp: p.timestamp, value: p.tps }));
  }

  return (
    <TimeSeriesChart
      data={mappedData}
      modelInfo={modelInfo}
      title="TPS (tokens/sec)"
      unit=" t/s"
      decimals={1}
      period={period}
    />
  );
}
