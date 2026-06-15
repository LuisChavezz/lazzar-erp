"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { PurchaseOrder } from "../interfaces/purchase-order.interface";

const columnHelper = createColumnHelper<PurchaseOrder>();

export const getColumns = () => {
  const columns = [
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: (info) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400">
            Estatus {info.getValue()}
          </span>
        ),
    }),
    columnHelper.accessor("folio", {
      header: "Folio",
      cell: (info) => (
        <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("proveedor", {
      header: "Proveedor",
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-sm">
          Proveedor #{info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("referencia", {
      header: "Referencia",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300">{info.getValue() || "—"}</span>
      ),
    }),
    columnHelper.accessor("fecha_oc", {
      header: "Fecha OC",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {info.getValue() ? new Date(info.getValue()).toLocaleDateString("es-MX") : "—"}
        </span>
      ),
    }),
    columnHelper.accessor("fecha_entrega_estimada", {
      header: "Entrega Estimada",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {info.getValue() ? new Date(info.getValue()).toLocaleDateString("es-MX") : "—"}
        </span>
      ),
    }),
    columnHelper.accessor("total", {
      header: "Total",
      cell: (info) => (
        <span className="text-slate-800 dark:text-white font-semibold tabular-nums">
          {Number(info.getValue()).toLocaleString("es-MX", {
            style: "currency",
            currency: "MXN",
          })}
        </span>
      ),
    }),
    columnHelper.accessor("subtotal", {
      header: "Subtotal",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {Number(info.getValue()).toLocaleString("es-MX", {
            style: "currency",
            currency: "MXN",
          })}
        </span>
      ),
    }),
    columnHelper.accessor("impuestos", {
      header: "Impuestos",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {Number(info.getValue()).toLocaleString("es-MX", {
            style: "currency",
            currency: "MXN",
          })}
        </span>
      ),
    }),
  ] as ColumnDef<PurchaseOrder>[];

  return columns;
};

