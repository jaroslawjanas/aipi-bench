"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer
        border border-border text-muted hover:text-text-primary hover:bg-bg-primary"
    >
      Log Out
    </button>
  );
}
