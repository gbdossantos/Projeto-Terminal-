import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ background: "#0F0E0B" }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="px-10 py-8">{children}</div>
      </main>
    </div>
  );
}
