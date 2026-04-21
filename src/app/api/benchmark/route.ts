import { NextResponse } from "next/server";
import { runAllModels } from "@/benchmarker/scheduler";

export async function POST() {
  try {
    await runAllModels();
    return NextResponse.json({ status: "completed" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}