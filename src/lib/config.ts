export const config = {
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:11434/v1",
  apiKey: process.env.API_KEY || "",
  models: (process.env.MODELS || "llama3").split(",").map((s) => s.trim()),
  interval: parseInt(process.env.BENCHMARK_INTERVAL || "7200000", 10),
  prompt: process.env.BENCHMARK_PROMPT || "Write a 2000 word long story",
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || "120000", 10),
  port: parseInt(process.env.PORT || "3000", 10),
};