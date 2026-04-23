import { parseSSEStream } from "./sse-parser";
import { config } from "@/lib/config";
import type { ConfigEntry } from "@/lib/config";
import type { SSEChunk } from "./sse-parser";

export interface BenchmarkResult {
  success: boolean;
  ttftMs: number | null;
  tps: number | null;
  totalTimeMs: number | null;
  tokensGenerated: number | null;
  promptSent: string;
  errorMessage: string | null;
}

export async function runBenchmark(
  entry: ConfigEntry,
  onChunk?: (chunk: SSEChunk) => void
): Promise<BenchmarkResult> {
  const promptText = entry.prompt ?? config.prompt;
  const prompt = `[${new Date().toISOString()}] ${promptText}`;
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.requestTimeout);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (entry.apiKey) headers["Authorization"] = `Bearer ${entry.apiKey}`;

    const response = await fetch(`${entry.endpoint}/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: entry.model,
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
    let firstTokenReceived = false;

    for await (const chunk of parseSSEStream(response)) {
      if (onChunk) {
        try {
          onChunk(chunk);
        } catch {
          // ignore callback errors
        }
      }

      const delta = chunk.choices?.[0]?.delta;
      const tokenText = delta?.reasoning || delta?.reasoning_content || delta?.content;
      if (!firstTokenReceived && tokenText) {
        ttftMs = Math.round(performance.now() - startTime);
        firstTokenReceived = true;
      }

      if (delta?.reasoning) content += delta.reasoning;
      else if (delta?.reasoning_content) content += delta.reasoning_content;

      if (delta?.content) content += delta.content;

      if (chunk.usage?.completion_tokens) {
        tokensGenerated = chunk.usage.completion_tokens;
      }
    }

    const totalTimeMs = Math.round(performance.now() - startTime);

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
