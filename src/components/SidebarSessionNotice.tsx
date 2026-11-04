"use client";

import { RefreshIcon } from "./Icons";
import { useSidebar } from "./SidebarProvider";

interface SidebarSessionNoticeProps {
  onRetry: () => void;
  variant?: "desktop" | "mobile";
}

const MESSAGE = "No se pudo cargar tu sesión.";

/**
 * Aviso del sidebar cuando la recuperación de la sesión se agotó (EC-767). No
 * bloquea: el resto de la pantalla sigue usable y el menú conserva los accesos
 * que no dependen de permisos. "Reintentar" lanza una ronda nueva; mientras
 * corre, el sidebar vuelve al skeleton.
 *
 * En escritorio ocupa la caja de un `SidebarItem` (icono de 24 px en `px-3 py-3`)
 * y su texto sigue la visibilidad de las etiquetas: con el sidebar colapsado
 * queda solo el icono, con el mensaje en `title`.
 */
export default function SidebarSessionNotice({
  onRetry,
  variant = "desktop",
}: SidebarSessionNoticeProps) {
  const { isPinned } = useSidebar();

  if (variant === "mobile") {
    return (
      <div
        role="status"
        className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
      >
        <span>{MESSAGE}</span>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-semibold underline-offset-2 hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div role="status">
      <button
        type="button"
        onClick={onRetry}
        title={`${MESSAGE} Reintentar`}
        className="relative flex w-full items-center gap-4 rounded-xl bg-amber-50 px-3 py-3 text-left text-amber-700 transition-colors hover:bg-amber-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
      >
        <RefreshIcon className="w-6 h-6 shrink-0" aria-hidden="true" />
        <span
          className={`absolute left-14 right-3 flex flex-col leading-tight transition-opacity duration-200 ${isPinned ? "opacity-100" : "opacity-0 group-hover/sidebar:opacity-100"}`}
        >
          <span className="truncate text-xs">{MESSAGE}</span>
          <span className="text-sm font-semibold">Reintentar</span>
        </span>
      </button>
    </div>
  );
}
