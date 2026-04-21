# AIPI Bench

AI model API performance benchmark tool. Periodically queries OpenAI-compatible APIs and measures TTFT, TPS, and total response time.

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migration
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Configuration

Set environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./data/benchmarks.db` | SQLite database path |
| `API_BASE_URL` | `http://localhost:11434/v1` | OpenAI-compatible API base URL |
| `API_KEY` | (empty) | API key (not needed for local Ollama) |
| `MODELS` | `llama3` | Comma-separated model names |
| `BENCHMARK_INTERVAL` | `7200000` | Interval in ms (2 hours default) |
| `BENCHMARK_PROMPT` | `Write a 2000 word long story` | Prompt text |
| `REQUEST_TIMEOUT` | `120000` | Request timeout in ms |

## Docker

```bash
docker compose up -d
```

The container connects to a local Ollama instance via `host.docker.internal:11434`.

## Tech Stack

- Next.js 15 + React 19 + TypeScript
- SQLite via Prisma ORM
- Tailwind CSS (dark theme)
- Recharts (charts with zoom)