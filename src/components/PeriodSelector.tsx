"use client";

interface PeriodSelectorProps {
  period: string;
  onPeriodChange: (period: string) => void;
}

const periods = [
  { value: "now", label: "Now" },
  { value: "5hr", label: "5hr" },
  { value: "24hr", label: "24hr" },
  { value: "3d", label: "3d" },
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