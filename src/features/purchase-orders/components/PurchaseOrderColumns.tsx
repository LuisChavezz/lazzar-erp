"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { ViewIcon } from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";

// Mapeo de estatus numérico a etiqueta y estilos de badge
const ESTATUS_MAP: Record<number, { label: string; className: string }> = {
  1: {
    label: "Borrador",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  },
  2: {
    label: "Pendiente",
    className: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
  3: {
    label: "Autorizado",
    className: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  },
  4: {
    label: "Completado",
    className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  5: {
    label: "Cancelado",
    className: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  },
};

const EstatusBadge = ({ estatus }: { estatus: number }) => {
  const config = ESTATUS_MAP[estatus] ?? {
    label: `Estatus ${estatus}`,
    className: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

const ActionsCell = () => {
  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => {},
    },
  ];

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
    </div>
  );
};

const columnHelper = createColumnHelper<PurchaseOrder>();

export const getColumns = () => {
  const columns = [
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: (info) => <EstatusBadge estatus={info.getValue()} />,
    }),
    columnHelper.accessor("folio", {
      header: "Folio",
      cell: (info) => (
        <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
          {info.getValue()}
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
    columnHelper.display({
      id: "acciones",
      header: "Acciones",
      cell: () => <ActionsCell />,
    }),
  ] as ColumnDef<PurchaseOrder>[];

  return columns;
};
