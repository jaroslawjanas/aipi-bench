import { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { runBenchmark } from "@/benchmarker/runner";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider, model, apiKey } = body;

  const cleanKey = apiKey.trim();

  if (!provider || !model || !cleanKey) {
    return new Response(
      JSON.stringify({ event: "error", data: { message: "Missing provider, model, or apiKey" } }) + "\n",
      { status: 400, headers: { "Content-Type": "application/x-ndjson" } }
    );
  }

  const providerConfig = config.community?.find((p) => p.provider === provider);
  if (!providerConfig) {
    return new Response(
      JSON.stringify({ event: "error", data: { message: "Provider not found" } }) + "\n",
      { status: 400, headers: { "Content-Type": "application/x-ndjson" } }
    );
  }

  const modelConfig = providerConfig.models.find((m) => m.model === model);
  if (!modelConfig) {
    return new Response(
      JSON.stringify({ event: "error", data: { message: "Model not found" } }) + "\n",
      { status: 400, headers: { "Content-Type": "application/x-ndjson" } }
    );
  }

  const entry = {
    provider: providerConfig.provider,
    endpoint: providerConfig.endpoint,
    apiKey: cleanKey,
    model: modelConfig.model,
    alias: modelConfig.alias,
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ event, data }) + "\n")
        );
      }

      try {
        const result = await runBenchmark(entry, (chunk) => {
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) {
            send("chunk", { content: delta.content });
          }
          if (chunk.usage?.completion_tokens) {
            send("progress", { tokens: chunk.usage.completion_tokens });
          }
        });

        if (result.success) {
          await prisma.communityResult.create({
            data: {
              provider: entry.provider,
              model: entry.model.toLowerCase(),
              alias: entry.alias,
              ttftMs: result.ttftMs,
              tps: result.tps,
            },
          });
        }

        send("result", result);
        controller.close();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send("error", { message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
