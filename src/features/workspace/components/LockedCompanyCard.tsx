import { BuildingIcon, LockIcon } from "@/src/components/Icons";

interface LockedCompanyCardProps {
  /** `null` mientras se carga el nombre. */
  name: string | null;
  rfc?: string | null;
}

/**
 * Empresa del workspace, de solo lectura (EC-842). Es la asignada al usuario en
 * el backend; no se puede cambiar desde aquí hasta que exista un endpoint para
 * ello (EC-843).
 */
export default function LockedCompanyCard({ name, rfc }: LockedCompanyCardProps) {
  return (
    <div
      aria-disabled="true"
      className="mb-8 flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 p-5 dark:border-slate-800 dark:bg-zinc-900/70"
    >
      <div className="rounded-xl bg-sky-50 p-3 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
        <BuildingIcon className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Empresa</p>
        {name ? (
          <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{name}</p>
        ) : (
          <div className="mt-1 h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        )}
        {rfc && <p className="text-xs text-slate-500 dark:text-slate-400">{rfc}</p>}
      </div>
      <span
        className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        title="Es la empresa asignada a tu usuario. Por ahora no se puede cambiar."
      >
        <LockIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Asignada a tu usuario
      </span>
    </div>
  );
}
