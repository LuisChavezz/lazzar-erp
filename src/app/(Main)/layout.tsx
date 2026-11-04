import "@/src/styles/radix-theme.css";

import { Header } from "@/src/components/Header";
import Sidebar from "@/src/components/Sidebar";
import BranchChangeLoader from "@/src/components/BranchChangeLoader";
import { SessionThemeProvider } from "@/src/app/SessionThemeProvider";
import { SessionRecoveryProvider } from "@/src/features/auth/components/SessionRecoveryProvider";
import { SidebarProvider } from "@/src/components/SidebarProvider";
import { SettingsModalProvider } from "@/src/features/settings/components/SettingsModalProvider";
import { GlobalSearchProvider } from "@/src/features/search/components/GlobalSearchProvider";

export const metadata = {
  title: "ERP NextJS",
  description: "ERP NextJS is a modern ERP system built with Next.js",
};

/**
 * Layout de todas las rutas autenticadas.
 *
 * NO lee la sesión en el servidor (`getServerSession`) a propósito: leer la
 * cookie aquí volvía dinámicas TODAS las rutas de (Main), y cada clic pagaba
 * una petición RSC a la función de Vercel antes de pintar nada (EC-767). Sin
 * ella las rutas se prerenderizan y el prefetch trae la ruta completa.
 *
 * `SessionProvider` arranca entonces sin sesión inicial: `useSession()` empieza
 * en `loading` y el cliente pide `/api/auth/session`. El sidebar muestra un
 * skeleton mientras tanto, y si esa lectura falla `SessionRecoveryProvider` la
 * reintenta (con aviso y "Reintentar" en el sidebar si se agota). Los botones
 * que dependen de permisos aparecen al llegar la sesión (aceptado). El acceso
 * no cambia: `src/proxy.ts` sigue exigiendo sesión, workspace y permiso de
 * módulo antes de servir la ruta, y el backend valida cada petición.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionThemeProvider>
      <SessionRecoveryProvider>
      <SettingsModalProvider>
        {/* Envuelve al header (su disparador) y a todas las páginas: monta la
            paleta de búsqueda una sola vez para todas las rutas de (Main). */}
        <GlobalSearchProvider>
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
        </GlobalSearchProvider>
      </SettingsModalProvider>
      </SessionRecoveryProvider>
    </SessionThemeProvider>
  );
}
