"use client";

import type { ReactNode } from "react";
import { ActionMenu, type ActionMenuItem } from "./ActionMenu";
import { ChevronRightIcon, ViewIcon } from "./Icons";

interface FolioModeProps {
  folio: string;
  items: ActionMenuItem[];
  /** Badge de estatus que va junto al folio. */
  status?: ReactNode;
}

interface NameModeProps {
  /** Nombre del registro (empleado, contrato…) que dispara el menú. */
  name: string;
  /**
   * "Ver detalle", siempre la PRIMERA acción del menú: con `href` es un enlace
   * real (clic medio abre otra pestaña); `onSelect` corre además del enlace
   * (p. ej. sembrar la caché del detalle). Sin él, el menú lleva solo `items`.
   */
  detail?: Pick<ActionMenuItem, "href" | "onSelect">;
  items: ActionMenuItem[];
  /**
   * Punto de `activo` junto al nombre, con su tooltip. `undefined` = el
   * registro no tiene ese ciclo de vida y no se pinta.
   */
  active?: boolean;
  /** Badge de estatus de negocio (`estado`) bajo el nombre. */
  status?: ReactNode;
}

/**
 * Celda que ES el menú de acciones de la fila: el folio o el nombre (con ">"
 * para que se lea como algo que se puede abrir) dispara el `ActionMenu`, y debajo
 * va el estatus. Reemplaza el par de columnas aparte "Estatus" y
 * "Acciones" — mismo patrón que el folio de Órdenes de compra y de
 * Cotizaciones de Mesa de Control.
 *
 * Dos modos:
 * - `folio`: listados con folio (Producción).
 * - `name`: listados sin folio (catálogos, RH), al estilo de Clientes: el nombre
 *   dispara el menú, con "Ver detalle" como primera acción, el punto de
 *   `activo` a su lado y el badge de `estado` debajo. Un listado con los dos
 *   ciclos (contratos, incidencias) pasa `active` y `status`.
 *
 * Las acciones (y los diálogos que abran) los decide la tabla: aquí solo se
 * pintan. El `ariaLabel` nombra el menú; el botón lleva su propio nombre
 * accesible con el folio o el nombre.
 */
export function FolioActionMenu(props: FolioModeProps | NameModeProps) {
  if ("name" in props) {
    return <NameActionMenu {...props} />;
  }
  const { folio, items, status } = props;
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

function NameActionMenu({ name, detail, items, active, status }: NameModeProps) {
  const menuItems: ActionMenuItem[] = detail
    ? [{ label: "Ver detalle", icon: ViewIcon, ...detail }, ...items]
    : items;
  const activeLabel = active ? "Activo" : "Inactivo";
  return (
    <div className="flex flex-col items-start gap-1 min-w-0">
      <div className="flex items-center gap-2 min-w-0 max-w-full">
        {active !== undefined && (
          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${active ? "bg-emerald-500" : "bg-slate-400"}`}
            role="img"
            aria-label={activeLabel}
            title={activeLabel}
          />
        )}
        <ActionMenu
          items={menuItems}
          ariaLabel={`Acciones de ${name}`}
          align="start"
          trigger={
            <button
              type="button"
              aria-label={`Ver acciones de ${name}`}
              title="Ver acciones"
              className="group inline-flex items-center gap-1 min-w-0 font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer text-left"
            >
              <span className="truncate">{name || "—"}</span>
              <ChevronRightIcon
                className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </button>
          }
        />
      </div>
      {status}
    </div>
  );
}
