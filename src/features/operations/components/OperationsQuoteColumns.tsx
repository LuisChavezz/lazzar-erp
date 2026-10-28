"use client";

import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { createContext, useContext } from "react";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import {
  ColumnHeaderFilter,
  FilterHeader,
  type ColumnFilterOption,
} from "@/src/components/ColumnHeaderFilter";
import {
  ALL_FILTER_OPTION,
  buildDistinctFilterOptions,
  buildMonthFilterOptions,
  matchesMonthFilter,
  matchesRangeFilter,
  type RangeFilterOption,
} from "@/src/utils/columnFilterOptions";
import {
  CheckCircleIcon,
  ChevronRightIcon,
  RejectIcon,
  SyncIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { capitalize } from "@/src/utils/capitalize";
import { formatQuoteAmountOrDash } from "@/src/features/quotes/utils/quoteDetailsFormatters";
import {
  canAcceptQuoteChanges as canAcceptOperationsQuoteChangesStatus,
  canManageQuoteAuthorization as canManageOperationsQuoteAuthorization,
} from "../../quotes/utils/quoteStatusRules";
import {
  formatQuoteDateTime as formatOperationsQuoteDateTime,
} from "../../quotes/utils/quoteDetailsFormatters";
import { KANBAN_COLUMNS } from "../../quotes/constants/kanbanColumns";
import { OperationsQuote } from "../interfaces/operations-quote.interface";

/**
 * Mismo mapeo estatus → color/label que el tablero Kanban de Cotizaciones
 * (Ventas) y su listado (`QuoteColumns.tsx`): reutilizarlo evita una segunda
 * fuente de verdad para los mismos 5 colores en la vista de Mesa de Control.
 */
function getOperationsQuoteStatusConfig(estatus: number) {
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

const estatusFilterFn: FilterFn<OperationsQuote> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return String(row.original.estatus) === filterValue;
};

// ─── Filtros de encabezado de las demás columnas ──────────────────────────────
// La lista completa vive en memoria, así que las opciones de razón social,
// mes y C.P. salen de sus filas (`buildOperationsQuoteFilterOptions`); piezas
// e importe usan rangos fijos.

export interface OperationsQuoteFilterOptions {
  razonesSociales: ColumnFilterOption[];
  meses: ColumnFilterOption[];
  codigosPostales: ColumnFilterOption[];
}

export function buildOperationsQuoteFilterOptions(
  quotes: OperationsQuote[],
): OperationsQuoteFilterOptions {
  return {
    razonesSociales: [
      ALL_FILTER_OPTION,
      ...buildDistinctFilterOptions(
        quotes,
        (q) => q.cliente_razon_social,
        (q) => capitalize(q.cliente_razon_social),
      ),
    ],
    meses: [ALL_FILTER_OPTION, ...buildMonthFilterOptions(quotes.map((q) => q.created_at))],
    codigosPostales: [
      ALL_FILTER_OPTION,
      ...buildDistinctFilterOptions(quotes, (q) => q.codigo_postal),
    ],
  };
}

const PIEZAS_RANGES: RangeFilterOption[] = [
  { value: "1-50", label: "1 a 50 piezas", max: 51 },
  { value: "51-500", label: "51 a 500 piezas", min: 51, max: 501 },
  { value: "mas-500", label: "Más de 500 piezas", min: 501 },
];

const IMPORTE_RANGES: RangeFilterOption[] = [
  { value: "hasta-10k", label: "Hasta $10,000", max: 10_000 },
  { value: "10k-100k", label: "$10,000 – $100,000", min: 10_000, max: 100_000 },
  { value: "mas-100k", label: "Más de $100,000", min: 100_000 },
];

const rangeOptions = (ranges: RangeFilterOption[]): ColumnFilterOption[] => [
  ALL_FILTER_OPTION,
  ...ranges.map(({ value, label }) => ({ value, label })),
];

const EMPTY_FILTER_OPTIONS: OperationsQuoteFilterOptions = {
  razonesSociales: [ALL_FILTER_OPTION],
  meses: [ALL_FILTER_OPTION],
  codigosPostales: [ALL_FILTER_OPTION],
};

// ─── Acciones de fila: los diálogos los posee la VISTA, no la celda ───────────
// Una celda se desmonta al ordenar, paginar o filtrar, y autorizar o rechazar
// saca la cotización del listado (mesa de control solo trae estatus 2 y 5): un
// diálogo dentro de ella se perdería a media operación. La celda solo PIDE la
// acción; `OperationsQuoteList` monta los diálogos
// (`OperationsQuoteActionDialogs`). Va por contexto, no por la factoría de
// columnas, para que `operationsQuoteColumns` siga siendo un arreglo estático.
export type OperationsQuoteRowAction =
  | "view"
  | "authorize"
  | "reject"
  | "acceptChanges"
  | "rejectChanges";

/** Acciones con mutación propia (todas salvo "ver"). */
export type OperationsQuoteMutatingAction = Exclude<OperationsQuoteRowAction, "view">;

/**
 * Ids de cotización con una acción EN CURSO, por acción. Los calcula UNA vez
 * `OperationsQuoteList` (`useMutationState`) en vez de una suscripción a la
 * caché de mutaciones por celda y por acción.
 */
export type OperationsQuoteRowBusy = Record<OperationsQuoteMutatingAction, number[]>;

interface OperationsQuoteRowActionsContextValue {
  requestAction: (action: OperationsQuoteRowAction, operationsQuote: OperationsQuote) => void;
  busy: OperationsQuoteRowBusy;
}

const OperationsQuoteRowActionsContext =
  createContext<OperationsQuoteRowActionsContextValue | null>(null);

export const OperationsQuoteRowActionsProvider = OperationsQuoteRowActionsContext.Provider;

function useOperationsQuoteRowActions() {
  const value = useContext(OperationsQuoteRowActionsContext);
  if (!value) {
    throw new Error(
      "operationsQuoteColumns debe renderizarse dentro de un OperationsQuoteRowActionsProvider (ver OperationsQuoteList)."
    );
  }
  return value;
}

const OperationsQuoteIdCell = ({
  operationsQuote,
}: {
  operationsQuote: OperationsQuote;
}) => {
  const { requestAction, busy } = useOperationsQuoteRowActions();
  const isAuthorizingOperationsQuote = busy.authorize.includes(operationsQuote.id);
  const isRejectingOperationsQuote = busy.reject.includes(operationsQuote.id);
  const isAcceptingChangesOperationsQuote = busy.acceptChanges.includes(operationsQuote.id);
  const isRejectingChangesOperationsQuote = busy.rejectChanges.includes(operationsQuote.id);

  const canAuthorizeOperationsQuote =
    canManageOperationsQuoteAuthorization(operationsQuote.estatus) &&
    operationsQuote.estatus === 2;
  const canAcceptOperationsQuoteChanges = canAcceptOperationsQuoteChangesStatus(
    operationsQuote.estatus
  );

  const handleOpenAuthorizeDialog = () => {
    if (!canAuthorizeOperationsQuote) return;
    requestAction("authorize", operationsQuote);
  };

  const handleOpenRejectDialog = () => {
    if (!canAuthorizeOperationsQuote) return;
    requestAction("reject", operationsQuote);
  };

  const handleOpenAcceptChangesDialog = () => {
    if (!canAcceptOperationsQuoteChanges) return;
    requestAction("acceptChanges", operationsQuote);
  };

  const handleOpenRejectChangesDialog = () => {
    if (!canAcceptOperationsQuoteChanges) return;
    requestAction("rejectChanges", operationsQuote);
  };

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: ViewIcon,
      onSelect: () => requestAction("view", operationsQuote),
    },
    {
      // Aprobar/rechazar tienen códigos propios en el catálogo:
      // A-MESACONTROL-COTI y D-MESACONTROL-COTI. `visible` sigue siendo la regla
      // de NEGOCIO (estatus de la cotización); el permiso es independiente.
      label: "Autorizar",
      icon: CheckCircleIcon,
      onSelect: handleOpenAuthorizeDialog,
      disabled: isAuthorizingOperationsQuote || isRejectingOperationsQuote,
      permission: "A-MESACONTROL-COTI",
      visible: canAuthorizeOperationsQuote,
    },
    {
      label: "Rechazar",
      icon: RejectIcon,
      onSelect: handleOpenRejectDialog,
      disabled: isRejectingOperationsQuote || isAuthorizingOperationsQuote,
      permission: "D-MESACONTROL-COTI",
      visible: canAuthorizeOperationsQuote,
    },
    {
      // Aceptar/rechazar CAMBIOS es la misma capacidad de aprobación sobre la
      // cotización, aplicada a una revisión: reutiliza los mismos códigos.
      label: "Aceptar cambios",
      icon: SyncIcon,
      onSelect: handleOpenAcceptChangesDialog,
      disabled:
        isAcceptingChangesOperationsQuote || isRejectingChangesOperationsQuote,
      permission: "A-MESACONTROL-COTI",
      visible: canAcceptOperationsQuoteChanges,
    },
    {
      label: "Rechazar cambios",
      icon: RejectIcon,
      onSelect: handleOpenRejectChangesDialog,
      disabled:
        isRejectingChangesOperationsQuote || isAcceptingChangesOperationsQuote,
      permission: "D-MESACONTROL-COTI",
      visible: canAcceptOperationsQuoteChanges,
    },
  ];

  const statusConfig = getOperationsQuoteStatusConfig(operationsQuote.estatus);

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusConfig?.accentDot ?? "bg-slate-400"}`}
        role="img"
        aria-label={statusConfig?.label ?? capitalize(operationsQuote.estatus_label)}
        title={statusConfig?.label ?? capitalize(operationsQuote.estatus_label)}
      />
      <ActionMenu
        items={items}
        ariaLabel="Acciones de cotización operativa"
        align="start"
        trigger={
          <button
            type="button"
            aria-label={`Ver acciones de la cotización #${operationsQuote.id}`}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 px-2.5 py-1 font-mono font-bold text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors cursor-pointer"
          >
            #{String(operationsQuote.id).padStart(5, "0")}
            <ChevronRightIcon
              className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
              aria-hidden="true"
            />
          </button>
        }
      />
    </div>
  );
};

/**
 * Columnas del listado de Mesa de Control. Fábrica (y no un arreglo estático)
 * porque los filtros de encabezado necesitan opciones construidas con TODO el
 * listado; las acciones de fila siguen yendo por contexto.
 */
export const getOperationsQuoteColumns = (
  filterOptions: OperationsQuoteFilterOptions = EMPTY_FILTER_OPTIONS,
): ColumnDef<OperationsQuote>[] => [
  {
    id: "id",
    accessorFn: (operationsQuote) =>
      `#${String(operationsQuote.id).padStart(5, "0")}`,
    meta: { label: "Cotización" },
    filterFn: estatusFilterFn,
    header: ({ column }) => (
      <div className="flex items-center gap-1.5">
        <span>Cotización</span>
        <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
      </div>
    ),
    // Sin columnas separadas de Estado/Acciones: el punto de color (mismo
    // mapeo que el tablero Kanban) y el menú completo cuelgan de este mismo
    // botón, igual que en `QuoteColumns.tsx` (Ventas).
    cell: ({ row }) => <OperationsQuoteIdCell operationsQuote={row.original} />,
  },
  {
    accessorKey: "cliente_razon_social",
    meta: { label: "Razón social" },
    header: ({ column }) => (
      <FilterHeader
        title="Razón social"
        column={column}
        options={filterOptions.razonesSociales}
        label="razón social"
        searchable={{ placeholder: "Buscar razón social…" }}
      />
    ),
    filterFn: (row, _columnId, filterValue) =>
      !filterValue || row.original.cliente_razon_social === filterValue,
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {capitalize(row.original.cliente_razon_social)}
      </span>
    ),
  },
  {
    accessorKey: "piezas",
    header: ({ column }) => (
      <FilterHeader
        title="Piezas"
        column={column}
        options={rangeOptions(PIEZAS_RANGES)}
        label="rango de piezas"
      />
    ),
    meta: { align: "right", label: "Piezas" },
    filterFn: (row, _columnId, filterValue) =>
      matchesRangeFilter(PIEZAS_RANGES, row.original.piezas, filterValue),
    size: 110,
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.original.piezas}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    meta: { label: "Fecha" },
    header: ({ column }) => (
      <FilterHeader title="Fecha" column={column} options={filterOptions.meses} label="mes" />
    ),
    filterFn: (row, _columnId, filterValue) =>
      matchesMonthFilter(row.original.created_at, filterValue),
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {formatOperationsQuoteDateTime(
          row.original.created_at,
          "d MMM yyyy, HH:mm"
        )}
      </span>
    ),
  },
  {
    // PLACEHOLDER a propósito: `OperationsQuote` todavía no expone
    // clasificación. Fija en "—" en todas las filas hasta que el backend la
    // agregue — mismo patrón que "Última Compra" en `CustomerColumns.tsx`.
    id: "clasificacion",
    header: "Clasificación",
    enableSorting: false,
    cell: () => <span className="text-slate-400 dark:text-slate-600">—</span>,
  },
  {
    accessorKey: "importe_sin_iva",
    header: ({ column }) => (
      <FilterHeader
        title="Importe sin IVA"
        column={column}
        options={rangeOptions(IMPORTE_RANGES)}
        label="rango de importe"
      />
    ),
    meta: { align: "right", label: "Importe sin IVA" },
    filterFn: (row, _columnId, filterValue) =>
      matchesRangeFilter(IMPORTE_RANGES, row.original.importe_sin_iva, filterValue),
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {formatQuoteAmountOrDash(row.original.importe_sin_iva, row.original.moneda_codigo)}
      </span>
    ),
  },
  {
    // Mismo `?? ""` que el resto de columnas nullable: un `null` en la primera
    // fila sacaría la columna de la búsqueda global en todas las filas.
    id: "codigo_postal",
    accessorFn: (operationsQuote) => operationsQuote.codigo_postal ?? "",
    meta: { label: "C.P." },
    header: ({ column }) => (
      <FilterHeader
        title="C.P."
        column={column}
        options={filterOptions.codigosPostales}
        label="código postal"
        searchable={{ placeholder: "Buscar C.P.…" }}
        menuAlign="end"
      />
    ),
    filterFn: (row, _columnId, filterValue) =>
      !filterValue || row.original.codigo_postal === filterValue,
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.original.codigo_postal || "—"}
      </span>
    ),
  },
];