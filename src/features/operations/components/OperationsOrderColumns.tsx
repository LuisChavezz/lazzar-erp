"use client";

import { type ColumnDef, type FilterFn } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
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
  BanIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  EditIcon,
  EyeIcon,
  WarehouseIcon,
} from "@/src/components/Icons";
import { formatOrderAmountOrDash } from "@/src/features/orders/utils/orderAmountFormat";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import {
  canEditPedidoMesaControl,
  getPedidoClasificacionLabel,
  PEDIDO_ESTATUS,
} from "@/src/features/orders/constants/pedidoStatus";
import { isOrderConfirmed } from "@/src/features/orders/components/SharedOrderColumns";
import { hasMeaningfulOc } from "@/src/features/orders/utils/pedidoFormat";

export { isOrderConfirmed };

/**
 * Columnas de Pedidos en Mesa de Control. NO reusa `createOrderColumns` de
 * `SharedOrderColumns.tsx` a propósito: ese archivo sigue sirviendo a Almacén
 * y Compras sin cambios (columnas Estado/Acciones separadas). Aquí, siguiendo
 * el mismo patrón que `SalesOrderColumns.tsx`, el folio funciona como trigger
 * del menú completo de acciones y lleva el punto de color de confirmación —
 * sin columnas aparte de "Estado"/"Acciones".
 */
export interface OperationsOrderColumnCallbacks {
  onViewDetail: (order: PedidoListItem) => void;
  onEditMesaControl: (order: PedidoListItem) => void;
  onProgramar: (order: PedidoListItem) => void;
  onReviewStock: (order: PedidoListItem) => void;
  onCancel: (order: PedidoListItem) => void;
}

const CONFIRMATION_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "por_confirmar", label: "Por confirmar", dotClassName: "bg-amber-500" },
  { value: "confirmado", label: "Confirmado", dotClassName: "bg-cyan-500" },
];

// ─── Filtros de encabezado de las demás columnas ──────────────────────────────
// La lista completa vive en memoria: las opciones de cliente, vendedor, mes y
// clasificación salen de sus filas; piezas e importe usan rangos fijos. El
// importe va sin símbolo, igual que la celda (la fila solo trae el id de
// moneda, ver `orderAmountFormat.ts`).

export interface OperationsOrderFilterOptions {
  clientes: ColumnFilterOption[];
  vendedores: ColumnFilterOption[];
  meses: ColumnFilterOption[];
  clasificaciones: ColumnFilterOption[];
}

export function buildOperationsOrderFilterOptions(
  orders: PedidoListItem[],
): OperationsOrderFilterOptions {
  return {
    clientes: [
      ALL_FILTER_OPTION,
      ...buildDistinctFilterOptions(orders, (o) => o.cliente, (o) => o.cliente_razon_social),
    ],
    vendedores: [
      ALL_FILTER_OPTION,
      ...buildDistinctFilterOptions(orders, (o) => o.vendedor_nombre),
    ],
    meses: [ALL_FILTER_OPTION, ...buildMonthFilterOptions(orders.map((o) => o.created_at))],
    clasificaciones: [
      ALL_FILTER_OPTION,
      ...buildDistinctFilterOptions(
        orders,
        (o) => o.clasificacion,
        (o) => getPedidoClasificacionLabel(o.clasificacion),
      ),
    ],
  };
}

const PIEZAS_RANGES: RangeFilterOption[] = [
  { value: "1-50", label: "1 a 50 piezas", max: 51 },
  { value: "51-500", label: "51 a 500 piezas", min: 51, max: 501 },
  { value: "mas-500", label: "Más de 500 piezas", min: 501 },
];

const IMPORTE_RANGES: RangeFilterOption[] = [
  { value: "hasta-10k", label: "Hasta 10,000", max: 10_000 },
  { value: "10k-100k", label: "10,000 – 100,000", min: 10_000, max: 100_000 },
  { value: "mas-100k", label: "Más de 100,000", min: 100_000 },
];

const rangeOptions = (ranges: RangeFilterOption[]): ColumnFilterOption[] => [
  ALL_FILTER_OPTION,
  ...ranges.map(({ value, label }) => ({ value, label })),
];

const EMPTY_FILTER_OPTIONS: OperationsOrderFilterOptions = {
  clientes: [ALL_FILTER_OPTION],
  vendedores: [ALL_FILTER_OPTION],
  meses: [ALL_FILTER_OPTION],
  clasificaciones: [ALL_FILTER_OPTION],
};

const confirmationFilterFn: FilterFn<PedidoListItem> = (row, _columnId, filterValue) => {
  if (!filterValue) return true;
  const confirmed = isOrderConfirmed(row.original);
  return filterValue === "confirmado" ? confirmed : !confirmed;
};

const FolioCell = ({
  order,
  onViewDetail,
  onEditMesaControl,
  onProgramar,
  onReviewStock,
  onCancel,
}: {
  order: PedidoListItem;
} & OperationsOrderColumnCallbacks) => {
  const confirmed = isOrderConfirmed(order);

  const items: ActionMenuItem[] = [
    { label: "Ver detalle", icon: EyeIcon, onSelect: () => onViewDetail(order) },
    // La fecha de confirmación se edita en la cabecera del detalle del pedido.
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEditMesaControl(order),
      permission: "E-MESACONTROL-PEDIDOS",
      visible: canEditPedidoMesaControl(order.estatus),
    },
    {
      label: "Programar",
      icon: CalendarDaysIcon,
      onSelect: () => onProgramar(order),
      permission: "E-MESACONTROL-PEDIDOS",
      visible: order.estatus !== PEDIDO_ESTATUS.CANCELADO,
    },
    {
      label: "Revisar inventario",
      icon: WarehouseIcon,
      onSelect: () => onReviewStock(order),
      permission: "R-MESACONTROL-PEDIDOS",
      visible: order.estatus !== PEDIDO_ESTATUS.CANCELADO,
    },
    // Un CANCELADO legado (`activo = true`, de antes de `/cancelar/`) sigue
    // listándose, pero no hay nada que cancelar.
    {
      label: "Cancelar pedido",
      icon: BanIcon,
      onSelect: () => onCancel(order),
      permission: "E-MESACONTROL-PEDIDOS",
      visible: order.estatus !== PEDIDO_ESTATUS.CANCELADO,
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${confirmed ? "bg-cyan-500" : "bg-amber-500"}`}
        role="img"
        aria-label={confirmed ? "Confirmado" : "Por confirmar"}
        title={confirmed ? "Confirmado" : "Por confirmar"}
      />
      <ActionMenu
        items={items}
        ariaLabel={`Acciones del pedido ${order.folio}`}
        align="start"
        trigger={
          <button
            type="button"
            aria-label={`Ver acciones del pedido ${order.folio}`}
            title="Ver detalle"
            className="group inline-flex items-center gap-1 font-mono text-[13px] font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            {order.folio || "—"}
            <ChevronRightIcon
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
              aria-hidden="true"
            />
          </button>
        }
      />
      {hasMeaningfulOc(order.oc) && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-mono"
          title={`Orden de compra: ${order.oc}`}
        >
          OC {order.oc}
        </span>
      )}
    </div>
  );
};

export function buildOperationsOrderColumns(
  callbacks: OperationsOrderColumnCallbacks,
  filterOptions: OperationsOrderFilterOptions = EMPTY_FILTER_OPTIONS,
): ColumnDef<PedidoListItem, unknown>[] {
  return [
    {
      id: "folio",
      accessorKey: "folio",
      filterFn: confirmationFilterFn,
      // Punto + folio (`P-00000-2026` en mono) + chevron miden ~124px; con el
      // ancho por defecto (150px, 118 útiles) la celda se partía en dos
      // líneas y el punto quedaba encima del folio. Mismo ancho que el folio
      // de `SalesOrderColumns.tsx`.
      size: 190,
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Folio</span>
          <ColumnHeaderFilter
            column={column}
            options={CONFIRMATION_FILTER_OPTIONS}
            label="estado de confirmación"
          />
        </div>
      ),
      cell: ({ row }) => <FolioCell order={row.original} {...callbacks} />,
    },
    {
      id: "razon_social",
      accessorKey: "cliente_razon_social",
      size: 240,
      meta: { label: "Razón social" },
      header: ({ column }) => (
        <FilterHeader
          title="Razón social"
          column={column}
          options={filterOptions.clientes}
          label="razón social"
          searchable={{ placeholder: "Buscar cliente…" }}
        />
      ),
      // Por id de cliente: dos razones sociales iguales no se mezclan.
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || String(row.original.cliente) === filterValue,
      cell: ({ row }) => (
        <span
          className="block text-sm text-slate-600 dark:text-slate-300 truncate"
          title={row.original.cliente_razon_social ?? undefined}
        >
          {row.original.cliente_razon_social || "—"}
        </span>
      ),
    },
    {
      // Todas las tallas, muestras incluidas (EC-571).
      id: "piezas",
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
      sortingFn: "basic",
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className="tabular-nums text-sm text-slate-600 dark:text-slate-300">
          {row.original.piezas}
        </span>
      ),
    },
    {
      // Vendedor de la cotización de origen; `null` sin cotización (EC-571).
      id: "vendedor",
      // Vacío → `undefined` para que `sortUndefined: "last"` lo deje al final.
      accessorFn: (order) => order.vendedor_nombre || undefined,
      meta: { label: "Vendedor" },
      header: ({ column }) => (
        <FilterHeader
          title="Vendedor"
          column={column}
          options={filterOptions.vendedores}
          label="vendedor"
          searchable={{ placeholder: "Buscar vendedor…" }}
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || row.original.vendedor_nombre === filterValue,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className="block text-sm text-slate-600 dark:text-slate-300 truncate max-w-45">
          {row.original.vendedor_nombre || "—"}
        </span>
      ),
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      meta: { label: "Fecha" },
      header: ({ column }) => (
        <FilterHeader title="Fecha" column={column} options={filterOptions.meses} label="mes" />
      ),
      filterFn: (row, _columnId, filterValue) =>
        matchesMonthFilter(row.original.created_at, filterValue),
      cell: ({ row }) => {
        const createdAt = row.original.created_at;
        return (
          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {createdAt ? format(new Date(createdAt), "d MMM yyyy", { locale: es }) : "—"}
          </span>
        );
      },
    },
    {
      // Misma etiqueta que el detalle del pedido y que Programación
      // (`getPedidoClasificacionLabel`). Ordena por código; sin clasificación, al final.
      id: "clasificacion",
      accessorFn: (order) => order.clasificacion || undefined,
      meta: { label: "Clasificación" },
      header: ({ column }) => (
        <FilterHeader
          title="Clasificación"
          column={column}
          options={filterOptions.clasificaciones}
          label="clasificación"
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || row.original.clasificacion === filterValue,
      // Etiqueta más larga: "X - Solo para facturar", igual que en Programación.
      size: 180,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {getPedidoClasificacionLabel(row.original.clasificacion)}
        </span>
      ),
    },
    {
      id: "importe_sin_iva",
      accessorKey: "subtotal",
      header: ({ column }) => (
        <FilterHeader
          title="Importe sin IVA"
          column={column}
          options={rangeOptions(IMPORTE_RANGES)}
          label="rango de importe"
          menuAlign="end"
        />
      ),
      meta: { align: "right", label: "Importe sin IVA" },
      filterFn: (row, _columnId, filterValue) =>
        matchesRangeFilter(IMPORTE_RANGES, row.original.subtotal, filterValue),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
          {formatOrderAmountOrDash(row.original.subtotal)}
        </span>
      ),
    },
    {
      // PLACEHOLDER: `PedidoListItem` no expone código postal.
      id: "cp",
      header: "C.P.",
      enableSorting: false,
      cell: () => <span className="text-slate-400 dark:text-slate-600">—</span>,
    },
  ];
}
