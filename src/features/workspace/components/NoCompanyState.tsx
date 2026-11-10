import type { ReactNode } from "react";
import { BuildingIcon } from "@/src/components/Icons";

interface NoCompanyStateProps {
  /** Acción opcional bajo el texto (p. ej. "Continuar" en /select-branch). */
  action?: ReactNode;
  /** Variante compacta para superficies pequeñas (la paleta de búsqueda). */
  compact?: boolean;
}

/** Título del aviso de "sin empresa asignada" (EC-842). */
export const NO_COMPANY_TITLE = "Tu usuario no tiene una empresa asignada";
/** Texto del aviso de "sin empresa asignada" (EC-842). */
export const NO_COMPANY_MESSAGE =
  "Los datos se muestran por la empresa de tu usuario. Pide a un administrador que te asigne una para ver esta información.";

/**
 * Aviso de "sin empresa asignada" (EC-842): la sesión dice `empresa: null`, y
 * el backend no sirve datos de ventas, finanzas ni terceros sin empresa. Se
 * muestra en lugar de tablas vacías.
 */
export default function NoCompanyState({ action, compact = false }: NoCompanyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center ${
        compact
          ? "px-4 py-8"
          : "rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 dark:border-slate-700 dark:bg-slate-800/50"
      }`}
    >
      <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
        <BuildingIcon className="h-8 w-8 text-slate-400" aria-hidden="true" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">{NO_COMPANY_TITLE}</h3>
      <p className="mb-6 max-w-md text-slate-500 dark:text-slate-400">{NO_COMPANY_MESSAGE}</p>
      {action}
    </div>
  );
}
