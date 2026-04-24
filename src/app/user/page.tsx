import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function UserPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">User Dashboard</h1>
        <p className="text-muted">Welcome, {user.username}. User dashboard coming soon.</p>
      </div>
    </div>
  );
}
