"use client";

import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Quote } from "../interfaces/quote.interface";
import { formatCurrency } from "../../../utils/formatCurrency";
import { formatQuoteDateTime } from "../utils/quoteDetailsFormatters";
import { capitalize } from "@/src/utils/capitalize";
import { ChevronRightIcon } from "@/src/components/Icons";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { KANBAN_COLUMNS } from "../constants/kanbanColumns";
import { QuoteCardActions } from "./QuoteCardActions";

/**
 * Mismo mapeo estatus → color/label que ya usa el tablero Kanban
 * (`KANBAN_COLUMNS`): Borrador/Por Autorizar/Autorizada/Rechazada/Cambios
 * Solicitados. Reutilizarlo evita una segunda fuente de verdad para los
 * mismos 5 colores.
 */
function getQuoteStatusConfig(estatus: number) {
  return KANBAN_COLUMNS.find((col) => col.estatus === estatus);
}

const ESTATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...KANBAN_COLUMNS.map((col) => ({
    value: String(col.estatus),
    label: col.label,
    dotClassName: col.accentDot,
  })),
];

/** El id de estatus es el filtrable real; la columna Cotización no lo muestra como texto, solo como punto de color. */
const estatusFilterFn: FilterFn<Quote> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.estatus) === filterValue;
};

/**
 * Clasificación / C.P. son PLACEHOLDER a propósito, pedidos explícitamente
 * para previsualizar el layout final: `Quote` (listado de
 * `GET /ventas/cotizaciones/`) no expone esos campos todavía. Su celda
 * (`PendingDataCell`) no lee ningún dato — es fija en TODAS las filas hasta
 * que el backend los agregue al listado; ese día, reemplazarla por un `cell`
 * normal con `accessorKey` en cada una.
 */
function PendingDataCell() {
  return <span className="block text-center text-slate-400 dark:text-slate-600">—</span>;
}

export const quoteColumns: ColumnDef<Quote>[] = [
  {
    accessorKey: "id",
    meta: { label: "Cotización" },
    filterFn: estatusFilterFn,
    header: ({ column }) => (
      <div className="flex items-center gap-1.5">
        <span>Cotización</span>
        <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
      </div>
    ),
    size: 150,
    // Sin columna Acciones aparte: el menú (Ver detalles/Editar/Enviar a
    // revisión/…) cuelga de este mismo botón vía `QuoteCardActions.trigger`
    // — un chip con fondo, ícono y flecha SIEMPRE visible (no solo al hover),
    // para que se note de inmediato que tiene una función propia. El punto de
    // color (mismo mapeo que el tablero Kanban) va AFUERA del botón, como en
    // Pedidos: es indicador, no parte de la acción.
    cell: ({ row }) => {
      const statusConfig = getQuoteStatusConfig(row.original.estatus);
      return (
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusConfig?.accentDot ?? "bg-slate-400"}`}
            role="img"
            aria-label={statusConfig?.label ?? "Sin estatus"}
            title={statusConfig?.label ?? "Sin estatus"}
          />
          <QuoteCardActions
            quote={row.original}
            align="start"
            trigger={
              <button
                type="button"
                aria-label={`Ver acciones de la cotización #${row.original.id}`}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 px-2.5 py-1 font-mono font-bold text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors cursor-pointer"
              >
                #{row.original.id}
                <ChevronRightIcon
                  className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                  aria-hidden="true"
                />
              </button>
            }
          />
        </div>
      );
    },
  },
  {
    accessorKey: "cliente_razon_social",
    meta: { label: "Razón social" },
    header: () => <div className="w-full text-center">Razón social</div>,
    cell: ({ row }) => (
      <span className="block text-center text-slate-600 dark:text-slate-300">
        {capitalize(row.original.cliente_razon_social)}
      </span>
    ),
  },
  {
    id: "piezas",
    meta: { label: "Piezas" },
    header: () => <div className="w-full text-center">Piezas</div>,
    size: 80,
    cell: ({ row }) => (
      <span className="block text-center text-slate-500 dark:text-slate-400">
        {row.original.piezas}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    meta: { label: "Fecha" },
    header: () => <div className="w-full text-center">Fecha</div>,
    cell: ({ row }) => (
      <span className="block text-center text-slate-600 dark:text-slate-300">
        {formatQuoteDateTime(row.original.created_at, "d MMM yyyy, HH:mm")}
      </span>
    ),
  },
  {
    id: "clasificacion",
    meta: { label: "Clasificación" },
    header: () => <div className="w-full text-center">Clasificación</div>,
    cell: PendingDataCell,
  },
  {
    id: "importeSinIva",
    accessorKey: "importe_sin_iva",
    meta: { label: "Importe sin IVA" },
    header: () => <div className="w-full text-center">Importe sin IVA</div>,
    cell: ({ row }) => (
      <span className="block text-center text-slate-500 dark:text-slate-400">
        {formatCurrency(Number(row.original.importe_sin_iva) || 0)}
      </span>
    ),
  },
  {
    id: "codigoPostal",
    meta: { label: "C.P." },
    header: () => <div className="w-full text-center">C.P.</div>,
    size: 80,
    cell: PendingDataCell,
  },
];
