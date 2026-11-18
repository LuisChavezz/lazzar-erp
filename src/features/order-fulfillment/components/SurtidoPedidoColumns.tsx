"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { RowProgressBar } from "@/src/components/ProgressPrimitives";
import { ListIcon } from "@/src/components/Icons";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import {
  getPedidoEstatusConfig,
  PEDIDO_ESTATUS_CONFIG,
} from "@/src/features/orders/constants/pedidoStatus";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import type { SurtidoPedido } from "../interfaces/order-fulfillment.interface";
import { useSurtidoPedidoRowActionsContext } from "../hooks/useSurtidoPedidoRowActions";
import { SurtidoEtapaChip } from "./SurtidoEtapaChip";

/** La barra se pinta "terminada" solo cuando el BACKEND lo afirma con su etapa. */
export const isSurtidoCompleto = (etapa: string) => etapa === "SURTIDO" || etapa === "DESPACHADO";

/**
 * Primera columna: punto y pill de estatus del pedido, el folio (enlace al
 * detalle 360°) y la acción de la fila, "Avance por talla", que abre el
 * diálogo. El diálogo vive en la lista y llega aquí por contexto.
 */
const PedidoCell = ({ pedido }: { pedido: SurtidoPedido }) => {
  const { onViewDetail } = useSurtidoPedidoRowActionsContext();
  const estatus = getPedidoEstatusConfig(pedido.estatus);
  // `estatus_display` llega en mayúsculas ("AUTORIZADA"): se usa la etiqueta
  // del mapa del ERP y solo un estatus fuera del mapa cae al texto del backend.
  const estatusLabel = PEDIDO_ESTATUS_CONFIG[pedido.estatus]?.label ?? (pedido.estatus_display || estatus.label);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${estatus.dot ?? "bg-slate-400"}`}
        title={estatusLabel}
        aria-hidden="true"
      />
      <div className="flex flex-col items-start gap-1 min-w-0">
        <PedidoFolioLink
          pedidoId={pedido.id}
          folio={pedido.folio}
          from="order-fulfillment"
          className="font-mono text-slate-700 dark:text-slate-200 font-semibold"
        />
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${estatus.className}`}
          >
            {estatusLabel}
          </span>
          <button
            type="button"
            onClick={() => onViewDetail(pedido)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 hover:underline cursor-pointer"
            title="Ver avance por talla"
            aria-label={`Ver avance por talla del pedido ${pedido.folio || pedido.id}`}
          >
            <ListIcon className="w-3 h-3" aria-hidden="true" />
            Por talla
          </button>
        </div>
      </div>
    </div>
  );
};

const quantityColumn = (
  key: "pedidas" | "surtidas" | "comprometidas" | "empacadas" | "despachadas",
  label: string,
  options: { muted?: boolean; hideOnMobile?: boolean; title?: string } = {},
): ColumnDef<SurtidoPedido> => ({
  id: key,
  accessorKey: key,
  meta: { align: "right", label, hideOnMobile: options.hideOnMobile },
  header: () => <span title={options.title}>{label}</span>,
  cell: ({ row }) => (
    <span
      className={`tabular-nums ${
        options.muted ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"
      }`}
    >
      {formatQuantityValue(row.original[key])}
    </span>
  ),
});

/**
 * Columnas del avance de surtido, para la tabla en MODO SERVIDOR: el backend
 * filtra, busca y pagina, y su orden es fijo (`-id`), así que ninguna columna
 * declara `meta.serverSort` ni filtra en memoria.
 *
 * Las cifras se pintan tal como llegan: el front no recalcula surtido ni
 * comprometido. La barra de % surtido acota solo su ANCHO a 100 (el backend no
 * topa el porcentaje) y su texto muestra el valor real.
 *
 * `salidas_manuales` NO se muestra: incluye las salidas que genera el despacho
 * (ver `SurtidoPedido.salidas_manuales`).
 */
export const surtidoPedidoColumns: ColumnDef<SurtidoPedido>[] = [
  {
    id: "pedido",
    accessorFn: (row) => row.folio ?? "",
    meta: { label: "Pedido" },
    header: "Pedido",
    cell: ({ row }) => <PedidoCell pedido={row.original} />,
  },
  {
    id: "cliente_nombre",
    accessorFn: (row) => row.cliente_nombre ?? "",
    meta: { label: "Cliente" },
    header: "Cliente",
    cell: ({ row }) => (
      <span
        className="block max-w-64 truncate text-slate-700 dark:text-slate-200"
        title={row.original.cliente_nombre ?? undefined}
      >
        {row.original.cliente_nombre || "—"}
      </span>
    ),
  },
  {
    id: "etapa",
    accessorKey: "etapa",
    meta: { label: "Etapa", align: "center" },
    header: "Etapa",
    cell: ({ row }) => <SurtidoEtapaChip etapa={row.original.etapa} />,
  },
  {
    id: "pct_surtido",
    accessorKey: "pct_surtido",
    meta: { label: "% surtido", align: "right" },
    header: "% surtido",
    cell: ({ row }) => (
      <RowProgressBar
        percentage={row.original.pct_surtido}
        complete={isSurtidoCompleto(row.original.etapa)}
      />
    ),
  },
  quantityColumn("pedidas", "Pedidas"),
  quantityColumn("surtidas", "Surtidas", { title: "Piezas surtidas por picking" }),
  quantityColumn("comprometidas", "Comprometidas", {
    title: "Pedidas − surtidas: lo que el pedido todavía aparta del stock",
  }),
  quantityColumn("empacadas", "Empacadas", {
    muted: true,
    hideOnMobile: true,
    title: "Informativo: piezas empacadas",
  }),
  quantityColumn("despachadas", "Despachadas", {
    muted: true,
    hideOnMobile: true,
    title: "Informativo: piezas despachadas",
  }),
];
