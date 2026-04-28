import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export async function GET() {
  const safeEntries = config.entries.map(({ apiKey, ...rest }) => rest);
  return NextResponse.json({ entries: safeEntries });
}
