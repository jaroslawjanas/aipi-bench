"use client";

interface PeriodSelectorProps {
  period: string;
  onPeriodChange: (period: string) => void;
}

const periods = [
  { value: "24h", label: "24hr" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

export default function PeriodSelector({ period, onPeriodChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-2">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onPeriodChange(p.value)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer
            ${period === p.value
              ? "bg-accent-blue text-white"
              : "bg-bg-card text-muted hover:bg-border"
            }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}