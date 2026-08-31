"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Quote } from "../interfaces/quote.interface";
import { formatCurrency } from "../../../utils/formatCurrency";
import { getStatusStyles } from "../utils/getStatusStyle";
import { formatQuoteDateTime } from "../utils/quoteDetailsFormatters";
import { capitalize } from "@/src/utils/capitalize";
import { getTipoPedidoConfig } from "../../orders/constants/pedidoStatus";
import { QuoteCardActions } from "./QuoteCardActions";

export const quoteColumns: ColumnDef<Quote>[] = [
  {
    accessorKey: "estatus_label",
    meta: { label: "Estado" },
    header: () => <div className="w-full text-center">Estado</div>,
    cell: ({ row }) => {
      const styles = getStatusStyles(row.original);
      return (
        <div className="flex justify-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
            {capitalize(row.original.estatus_label)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "tipo_pedido",
    meta: { label: "Tipo" },
    header: () => <div className="w-full text-center">Tipo</div>,
    cell: ({ row }) => {
      // Etiqueta Y color salen de `getTipoPedidoConfig`, no de
      // `tipo_pedido_label` del API: el config ya trae el casing de la app
      // ("Pedido de venta" en vez de "PEDIDO DE VENTA") y un badge neutro
      // "Desconocido (n)" si el backend agrega un tipo que aquí no existe.
      const { label, className } = getTipoPedidoConfig(row.original.tipo_pedido);
      return (
        <div className="flex justify-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
            {label}
          </span>
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
    accessorKey: "gran_total",
    meta: { label: "Total" },
    header: () => <div className="w-full text-center">Total</div>,
    cell: ({ row }) => (
      <div className="text-center font-semibold text-slate-800 dark:text-slate-100">
        {formatCurrency(Number(row.original.gran_total) || 0)}
      </div>
    ),
  },
  {
    id: "actions",
    meta: { label: "Acciones" },
    header: () => <div className="text-center">Acciones</div>,
    size: 90,
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <QuoteCardActions quote={row.original} align="center" />
      </div>
    ),
  },
];
