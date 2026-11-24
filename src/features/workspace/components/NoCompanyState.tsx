import type { ReactNode } from "react";
import Link from "next/link";
import { BuildingIcon } from "@/src/components/Icons";
import { useIsSuperuser } from "@/src/features/users/hooks/useIsSuperuser";

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

/** Título del aviso para el superusuario sin empresa activa (#506). */
export const NO_ACTIVE_COMPANY_TITLE = "No tienes una empresa activa";
/** Texto del aviso para el superusuario sin empresa activa (#506). */
export const NO_ACTIVE_COMPANY_MESSAGE =
  "Los datos se muestran por la empresa activa. Elige una para ver esta información.";

/**
 * Selector de empresa del superusuario (EC-847): vive en /select-branch
 * (`CompanySwitcherCard`), el mismo destino que el "Sin empresa activa" del
 * encabezado (`WorkspaceInfo`). No se abre aquí: el cambio termina siempre con
 * una carga completa de /select-branch para elegir sucursal.
 */
const COMPANY_SELECTOR_PATH = "/select-branch";

/**
 * Aviso de "sin empresa" (EC-842): la sesión dice `empresa: null`, y el
 * backend no sirve datos acotados a la empresa sin ella. Se muestra en lugar
 * de tablas vacías.
 *
 * Para el superusuario la causa es otra: no le falta una asignación, sino
 * elegir una empresa activa, cosa que puede hacer él mismo (EC-847). Por eso
 * su aviso lo dice y, fuera de la variante compacta, lleva al selector. Los
 * demás usuarios ven el texto de siempre. `action` reemplaza la acción en
 * ambos casos.
 */
export default function NoCompanyState({ action, compact = false }: NoCompanyStateProps) {
  const isSuperuser = useIsSuperuser();
  const title = isSuperuser ? NO_ACTIVE_COMPANY_TITLE : NO_COMPANY_TITLE;
  const message = isSuperuser ? NO_ACTIVE_COMPANY_MESSAGE : NO_COMPANY_MESSAGE;
  const resolvedAction =
    action ??
    (isSuperuser && !compact ? (
      <Link
        href={COMPANY_SELECTOR_PATH}
        className="rounded-xl bg-sky-500 px-6 py-2.5 font-medium text-white shadow-lg shadow-sky-500/20 transition-colors hover:bg-sky-600"
      >
        Elegir empresa
      </Link>
    ) : undefined);

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
      <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mb-6 max-w-md text-slate-500 dark:text-slate-400">{message}</p>
      {resolvedAction}
    </div>
  );
}
