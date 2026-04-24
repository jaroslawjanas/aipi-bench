import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import RunBenchmarkButton from "@/components/RunBenchmarkButton";

export default async function AdminDashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalServerResults,
    totalCommunityResults,
    last24hServer,
    last24hCommunity,
    activeModels,
  ] = await Promise.all([
    prisma.result.count(),
    prisma.communityResult.count(),
    prisma.result.findMany({
      where: { timestamp: { gte: dayAgo }, success: true },
      select: { ttftMs: true, tps: true },
    }),
    prisma.communityResult.findMany({
      where: { timestamp: { gte: dayAgo } },
      select: { ttftMs: true, tps: true },
    }),
    prisma.result.groupBy({
      by: ["provider", "model"],
      where: { timestamp: { gte: dayAgo } },
      _count: { id: true },
    }),
  ]);

  const serverTtftAvg =
    last24hServer.length > 0
      ? last24hServer.reduce((sum, r) => sum + (r.ttftMs ?? 0), 0) / last24hServer.length
      : null;
  const serverTpsAvg =
    last24hServer.length > 0
      ? last24hServer.reduce((sum, r) => sum + (r.tps ?? 0), 0) / last24hServer.length
      : null;

  const communityTtftAvg =
    last24hCommunity.length > 0
      ? last24hCommunity.reduce((sum, r) => sum + (r.ttftMs ?? 0), 0) / last24hCommunity.length
      : null;
  const communityTpsAvg =
    last24hCommunity.length > 0
      ? last24hCommunity.reduce((sum, r) => sum + (r.tps ?? 0), 0) / last24hCommunity.length
      : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Server Benchmarks" value={totalServerResults.toLocaleString()} />
        <StatCard title="Community Benchmarks" value={totalCommunityResults.toLocaleString()} />
        <StatCard title="Active Models (24h)" value={activeModels.length.toString()} />
        <StatCard
          title="Total Benchmarks (24h)"
          value={(last24hServer.length + last24hCommunity.length).toLocaleString()}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Server (Last 24h)</h2>
          <div className="space-y-3">
            <MetricRow label="Avg TTFT" value={serverTtftAvg !== null ? `${(serverTtftAvg / 1000).toFixed(2)}s` : "—"} />
            <MetricRow label="Avg TPS" value={serverTpsAvg !== null ? `${serverTpsAvg.toFixed(1)} t/s` : "—"} />
          </div>
        </div>

        <div className="bg-bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Community (Last 24h)</h2>
          <div className="space-y-3">
            <MetricRow label="Avg TTFT" value={communityTtftAvg !== null ? `${(communityTtftAvg / 1000).toFixed(2)}s` : "—"} />
            <MetricRow label="Avg TPS" value={communityTpsAvg !== null ? `${communityTpsAvg.toFixed(1)} t/s` : "—"} />
          </div>
        </div>
      </div>

      <div className="bg-bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <RunBenchmarkButton />
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      <p className="text-sm text-muted mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}
