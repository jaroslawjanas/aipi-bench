"use client";

interface ColorBadgeProps {
  value: number;
  thresholds: { green: number; yellow: number };
  invert?: boolean;
  suffix?: string;
}

export default function ColorBadge({ value, thresholds, invert = false, suffix = "" }: ColorBadgeProps) {
  let color: string;
  if (invert) {
    color = value >= thresholds.green ? "text-accent-green" : value >= thresholds.yellow ? "text-accent-yellow" : "text-accent-red";
  } else {
    color = value <= thresholds.green ? "text-accent-green" : value <= thresholds.yellow ? "text-accent-yellow" : "text-accent-red";
  }

  return <span className={`font-mono ${color}`}>{value}{suffix}</span>;
}