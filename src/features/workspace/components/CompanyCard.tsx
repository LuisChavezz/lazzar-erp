import type { ReactNode } from "react";
import { BuildingIcon } from "@/src/components/Icons";

interface CompanyCardProps {
  /** Rótulo sobre el nombre ("Empresa", "Empresa activa"). */
  label: string;
  /** `null` mientras se carga el nombre: se pinta un esqueleto. */
  name: string | null;
  /** Texto en lugar del nombre cuando NO hay empresa (sin esqueleto). */
  emptyName?: string;
  rfc?: string | null;
  /** Línea extra bajo el nombre (p. ej. un aviso de estado). */
  detail?: ReactNode;
  /** Lo que va a la derecha: la insignia de bloqueo o el botón de cambio. */
  action: ReactNode;
  /** La tarjeta no es interactiva (`aria-disabled`). */
  disabled?: boolean;
}

/**
 * Tarjeta de la empresa del workspace en /select-branch, compartida por
 * `LockedCompanyCard` (solo lectura) y `CompanySwitcherCard` (superusuario,
 * EC-847): misma caja, icono, nombre y RFC; solo cambia la acción.
 */
export default function CompanyCard({
  label,
  name,
  emptyName,
  rfc,
  detail,
  action,
  disabled = false,
}: CompanyCardProps) {
  return (
    <div
      aria-disabled={disabled ? "true" : undefined}
      className="mb-8 flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 p-5 dark:border-slate-800 dark:bg-zinc-900/70"
    >
      <div className="rounded-xl bg-sky-50 p-3 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
        <BuildingIcon className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {name ? (
          <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{name}</p>
        ) : emptyName ? (
          <p className="text-lg font-bold text-slate-500 dark:text-slate-400">{emptyName}</p>
        ) : (
          <div className="mt-1 h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        )}
        {rfc && <p className="text-xs text-slate-500 dark:text-slate-400">{rfc}</p>}
        {detail}
      </div>
      {action}
    </div>
  );
}
