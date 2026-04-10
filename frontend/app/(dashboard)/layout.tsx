import { TopNav } from "@/components/layout/TopNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: "#0F0E0B" }}>
      <TopNav />
      <main className="max-w-6xl mx-auto px-10 py-8">
        {children}
      </main>
    </div>
  );
}
