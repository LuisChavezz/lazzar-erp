import "@/src/styles/radix-theme.css";

import { Header } from "@/src/components/Header";
import Sidebar from "@/src/components/Sidebar";
import BranchChangeLoader from "@/src/components/BranchChangeLoader";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { SessionThemeProvider } from "@/src/app/SessionThemeProvider";
import { SidebarProvider } from "@/src/components/SidebarProvider";
import { SettingsModalProvider } from "@/src/features/settings/components/SettingsModalProvider";

export const metadata = {
  title: "ERP NextJS",
  description: "ERP NextJS is a modern ERP system built with Next.js",
};

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <SessionThemeProvider session={session}>
      <SettingsModalProvider>
        <SidebarProvider>
        <div className="flex h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white overflow-hidden selection:bg-sky-500 selection:text-white">
          {/* Background Gradients */}
          <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(110%_70%_at_50%_-10%,rgba(56,189,248,0.28),rgba(255,255,255,0))] dark:bg-[radial-gradient(120%_85%_at_50%_-20%,rgba(56,189,248,0.22),rgba(17,17,19,0))]"></div>

          <Sidebar />

          {/* MAIN CONTENT WRAPPER */}
          <div className="flex-1 flex flex-col relative overflow-hidden h-full">
            {/* DESKTOP HEADER (Search + Notifs) */}
            <Header />

            {/* PAGE CONTENT */}
            <main
              className="flex-1 w-full overflow-y-auto px-6 pb-6 pt-20 md:px-12 md:pb-12 md:pt-0"
              style={{ scrollbarGutter: "stable both-edges" }}
            >
              <BranchChangeLoader>{children}</BranchChangeLoader>
            </main>
          </div>
        </div>
        </SidebarProvider>
      </SettingsModalProvider>
    </SessionThemeProvider>
  );
}
