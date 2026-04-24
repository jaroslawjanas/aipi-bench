"use client";

export default function RunBenchmarkButton() {
  async function handleClick() {
    try {
      await fetch("/api/benchmark", { method: "POST" });
      alert("Benchmark started!");
    } catch {
      alert("Failed to start benchmark.");
    }
  }

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer
        bg-accent-blue text-white hover:bg-accent-blue/90"
    >
      Run All Benchmarks Now
    </button>
  );
}
