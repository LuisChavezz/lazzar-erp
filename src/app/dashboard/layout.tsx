import { DashboardHeader } from "@/src/components/Header";
import Sidebar from "@/src/components/Sidebar";

export const metadata = {
  title: "Dashboard",
  description: "Dashboard of the application",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* Background Gradients */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(110%_70%_at_50%_-10%,rgba(56,189,248,0.28),rgba(255,255,255,0))] dark:bg-[radial-gradient(120%_85%_at_50%_-20%,rgba(56,189,248,0.22),rgba(17,17,19,0))]"></div>

      <Sidebar />

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col relative overflow-hidden h-full">
        {/* DESKTOP HEADER (Search + Notifs) */}
        <DashboardHeader />

        {/* PAGE CONTENT */}
        <main className="flex-1 w-full overflow-y-auto px-6 pb-6 md:px-8 md:pb-8 pt-20 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
