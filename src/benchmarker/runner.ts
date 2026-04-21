import { parseSSEStream } from "./sse-parser";
import { config } from "@/lib/config";

export interface BenchmarkResult {
  success: boolean;
  ttftMs: number | null;
  tps: number | null;
  totalTimeMs: number | null;
  tokensGenerated: number | null;
  promptSent: string;
  errorMessage: string | null;
}

export async function runBenchmark(model: string): Promise<BenchmarkResult> {
  const prompt = `[${new Date().toISOString()}] ${config.prompt}`;
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeout);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

    const response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        ttftMs: null,
        tps: null,
        totalTimeMs: null,
        tokensGenerated: null,
        promptSent: prompt,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    let ttftMs: number | null = null;
    let content = "";
    let tokensGenerated: number | null = null;
    let firstContentChunk = true;

    for await (const chunk of parseSSEStream(response)) {
      // Capture TTFT on first content-bearing chunk
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content && firstContentChunk) {
        ttftMs = Math.round(performance.now() - startTime);
        firstContentChunk = false;
      }

      if (delta?.content) content += delta.content;

      // Capture usage data from final chunk
      if (chunk.usage?.completion_tokens) {
        tokensGenerated = chunk.usage.completion_tokens;
      }
    }

    const totalTimeMs = Math.round(performance.now() - startTime);

    // Fallback token estimation if usage wasn't provided
    if (tokensGenerated === null) {
      tokensGenerated = Math.round(content.length / 4);
    }

    const totalTimeSeconds = totalTimeMs / 1000;
    const tps = totalTimeSeconds > 0 ? tokensGenerated / totalTimeSeconds : null;

    return {
      success: true,
      ttftMs,
      tps: tps !== null ? Math.round(tps * 10) / 10 : null,
      totalTimeMs,
      tokensGenerated,
      promptSent: prompt,
      errorMessage: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      ttftMs: null,
      tps: null,
      totalTimeMs: null,
      tokensGenerated: null,
      promptSent: prompt,
      errorMessage: message,
    };
  }
}