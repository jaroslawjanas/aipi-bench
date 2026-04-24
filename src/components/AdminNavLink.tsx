"use client";

import { usePathname } from "next/navigation";

interface AdminNavLinkProps {
  href: string;
  children: React.ReactNode;
}

export default function AdminNavLink({ href, children }: AdminNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));

  return (
    <a
      href={href}
      className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "text-text-primary bg-bg-primary"
          : "text-muted hover:text-text-primary hover:bg-bg-primary"
      }`}
    >
      {children}
    </a>
  );
}
