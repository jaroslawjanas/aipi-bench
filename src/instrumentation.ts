export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/benchmarker/scheduler");
    startScheduler();
  }
}