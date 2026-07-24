import "@/src/styles/radix-theme.css";

import { getServerSession } from "next-auth";
import { SessionThemeProvider } from "@/src/app/SessionThemeProvider";
import { authOptions } from "@/src/lib/auth";

export const metadata = {
  title: "Seleccionar Sucursal",
  description: "Selecciona tu empresa y sucursal de trabajo",
};

export default async function SelectBranchLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <SessionThemeProvider session={session}>
      <div className="bg-slate-50 dark:bg-black min-h-screen flex flex-col items-center justify-center py-12 transition-colors duration-300 relative selection:bg-sky-500 selection:text-white">
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(110%_70%_at_50%_-10%,rgba(56,189,248,0.28),rgba(255,255,255,0))] dark:bg-[radial-gradient(120%_85%_at_50%_-20%,rgba(56,189,248,0.22),rgba(17,17,19,0))]"></div>
        {children}
      </div>
    </SessionThemeProvider>
  );
}
