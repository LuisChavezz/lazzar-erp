"use client";

import { type ColumnDef, type FilterFn } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  EditIcon,
  EyeIcon,
} from "@/src/components/Icons";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import {
  canEditPedidoMesaControl,
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
}

const CONFIRMATION_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  { value: "por_confirmar", label: "Por confirmar", dotClassName: "bg-amber-500" },
  { value: "confirmado", label: "Confirmado", dotClassName: "bg-cyan-500" },
];

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
            className="group inline-flex items-center gap-1 font-mono text-[13px] font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
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
  callbacks: OperationsOrderColumnCallbacks
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
      header: "Razón social",
      cell: ({ row }) => (
        <span className="block text-sm text-slate-600 dark:text-slate-300 truncate max-w-55">
          {row.original.cliente_razon_social || "—"}
        </span>
      ),
    },
    {
      // PLACEHOLDER a propósito: `PedidoListItem` (listado de
      // `GET /ventas/pedidos/`) no expone piezas — fija en "—" hasta que el
      // backend la agregue, mismo patrón que "Última Compra" en
      // `CustomerColumns.tsx`.
      id: "piezas",
      header: "Piezas",
      meta: { align: "right" },
      enableSorting: false,
      cell: () => <span className="text-slate-400 dark:text-slate-600">—</span>,
    },
    {
      // PLACEHOLDER: `PedidoListItem` no expone vendedor.
      id: "vendedor",
      header: "Vendedor",
      enableSorting: false,
      cell: () => <span className="text-slate-400 dark:text-slate-600">—</span>,
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Fecha",
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
      // PLACEHOLDER: `PedidoListItem` no expone clasificación.
      id: "clasificacion",
      header: "Clasificación",
      enableSorting: false,
      cell: () => <span className="text-slate-400 dark:text-slate-600">—</span>,
    },
    {
      id: "importe_sin_iva",
      accessorKey: "subtotal",
      header: "Importe sin IVA",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
          {formatMoneyValueOrDash(row.original.subtotal)}
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
