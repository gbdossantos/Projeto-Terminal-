"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFullWidth = pathname === "/simulador" || pathname === "/mercado";

  return (
    <div className="min-h-screen" style={{ background: "#0F0E0B" }}>
      <TopNav />
      {isFullWidth ? (
        <main>{children}</main>
      ) : (
        <main className="max-w-6xl mx-auto px-10 py-8">{children}</main>
      )}
    </div>
  );
}
