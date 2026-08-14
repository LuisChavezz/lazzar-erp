"use client";

import { Dialog, VisuallyHidden } from "@radix-ui/themes";
import { PlugIcon, SettingsIcon, XIcon } from "@/src/components/Icons";
import { useSettingsModal, type SettingsTab } from "../hooks/useSettingsModal";
import { GeneralPanel } from "./GeneralPanel";
import { IntegrationsPanel } from "./IntegrationsPanel";

// ─── Definición de pestañas ───────────────────────────────────────────────────

const TABS: Array<{
  key: SettingsTab;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  {
    key: "general",
    label: "General",
    description: "Preferencias de la interfaz para este navegador.",
    icon: SettingsIcon,
  },
  {
    key: "integrations",
    label: "Integraciones",
    description: "Cuentas externas enlazadas a tu usuario.",
    icon: PlugIcon,
  },
];

// ─── Modal ────────────────────────────────────────────────────────────────────

/**
 * Modal de configuración de cuenta: barra lateral de pestañas + panel de
 * contenido. Controlado desde `SettingsModalProvider` vía `useSettingsModal`.
 *
 * Los estados de las pestañas replican los de la navegación lateral de la app
 * (`Sidebar`): activo en `bg-sky-50 / dark:bg-sky-500/10` con texto sky y
 * esquinas `rounded-xl`. La barra queda a la altura de la superficie del
 * diálogo y el panel de contenido se recuesta con un tono más bajo, de modo que
 * las tarjetas de cada sección resalten igual que en las páginas del ERP.
 */
export function SettingsModal() {
  const { isOpen, activeTab, close, setActiveTab } = useSettingsModal();
  const active = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <Dialog.Content
        maxWidth="780px"
        className="p-0! overflow-hidden bg-white! dark:bg-zinc-900! dark:text-white!"
      >
        <VisuallyHidden>
          <Dialog.Description>
            Preferencias de la cuenta: apariencia e integraciones.
          </Dialog.Description>
        </VisuallyHidden>

        <div className="flex flex-col sm:flex-row sm:min-h-[440px]">
          {/* ── Barra lateral: título + pestañas ── */}
          <aside className="shrink-0 border-b border-slate-200/70 p-4 dark:border-white/10 sm:w-60 sm:border-b-0 sm:border-r sm:p-5">
            {/*
              Se usan las props nativas de Radix (size/mb) en lugar de utilidades
              Tailwind: `Dialog.Title` es un `Heading` de Radix Themes con estilos
              propios que, según el orden de importación de CSS, pueden ganarle a
              las clases de Tailwind. Su color ya sigue el `appearance` del tema.
            */}
            <Dialog.Title size="3" mb="0" className="px-1">
              Ajustes
            </Dialog.Title>

            <nav
              aria-label="Secciones de configuración"
              className="mt-4 flex gap-1 sm:flex-col sm:gap-1.5"
            >
              {TABS.map(({ key, label, icon: Icon }) => {
                const isActive = key === activeTab;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:flex-none ${
                      isActive
                        ? "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"
                        : "text-slate-500 hover:bg-sky-50 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-sky-500/10 dark:hover:text-sky-300"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ── Panel de contenido ── */}
          <div className="relative max-h-[80vh] flex-1 overflow-y-auto bg-slate-50/60 p-5 dark:bg-black/20 md:p-6">
            <Dialog.Close
              aria-label="Cerrar configuración"
              className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 transition-colors cursor-pointer hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-300"
            >
              <XIcon className="h-6 w-6" aria-hidden="true" />
            </Dialog.Close>

            <header className="mb-5 pr-12">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {active.label}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {active.description}
              </p>
            </header>

            {activeTab === "general" ? <GeneralPanel /> : <IntegrationsPanel />}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
