"use client";

import type { ReactNode } from "react";
import { ActionMenu, type ActionMenuItem } from "./ActionMenu";
import { ChevronRightIcon } from "./Icons";

/**
 * Celda de folio que ES el menú de acciones de la fila: el folio (con ">"
 * para que se lea como algo que se puede abrir) dispara el `ActionMenu`, y debajo
 * va el estatus. Reemplaza el par de columnas aparte "Estatus" y
 * "Acciones" en los listados de Producción — mismo patrón que el folio de
 * Órdenes de compra y de Cotizaciones de Mesa de Control.
 *
 * Las acciones (y los diálogos que abran) los decide la tabla: aquí solo se
 * pintan. El `ariaLabel` nombra el menú; el botón lleva su propio nombre
 * accesible con el folio.
 */
export function FolioActionMenu({
  folio,
  items,
  status,
}: {
  folio: string;
  items: ActionMenuItem[];
  /** Badge de estatus que va junto al folio. */
  status?: ReactNode;
}) {
  return (
    // Folio arriba y estatus debajo: siempre en dos líneas, para que el folio
    // (largo, tipo `2026-CM-00006`) nunca empuje ni recorte la etiqueta.
    <div className="flex flex-col items-start gap-1 min-w-0">
      <ActionMenu
        items={items}
        ariaLabel={`Acciones de ${folio}`}
        align="start"
        trigger={
          <button
            type="button"
            aria-label={`Ver acciones de ${folio}`}
            title="Ver acciones"
            className="group inline-flex items-center gap-1 font-mono text-[13px] font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer whitespace-nowrap"
          >
            {folio || "—"}
            <ChevronRightIcon
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
              aria-hidden="true"
            />
          </button>
        }
      />
      {status}
    </div>
  );
}
