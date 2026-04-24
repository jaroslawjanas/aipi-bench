import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function AdminUsersPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Users</h1>
      <div className="bg-bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted">User management coming soon.</p>
      </div>
    </div>
  );
}
