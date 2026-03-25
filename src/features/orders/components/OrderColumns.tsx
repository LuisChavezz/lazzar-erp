"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { Order } from "../interfaces/order.interface";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { OrderDetails } from "./OrderDetails";
import {
  EmbarquesIcon,
  FacturacionIcon,
  ViewIcon,
} from "../../../components/Icons";
import { formatCurrency } from "../../../utils/formatCurrency";

const statusDialogColors: Record<number, "sky" | "emerald" | "amber" | "rose"> = {
  1: "amber",
  2: "sky",
  3: "emerald",
  4: "rose",
};

const ActionsCell = ({ order }: { order: Order }) => {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: ViewIcon,
      onSelect: () => setIsViewOpen(true),
    },
    {
      label: "Facturar",
      icon: FacturacionIcon,
      onSelect: () => undefined,
    },
    {
      label: "Marcar como enviado",
      icon: EmbarquesIcon,
      onSelect: () => undefined,
    },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={items} ariaLabel="Acciones de pedido" />
      {isViewOpen && (
        <MainDialog
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
          maxWidth="1000px"
          title={
            <DialogHeader
              title={`Detalles del pedido #${order.id}`}
              subtitle={order.persona_pagos}
              statusColor={statusDialogColors[order.estatus] ?? "sky"}
            />
          }
        >
          <OrderDetails order={order} />
        </MainDialog>
      )}
    </div>
  );
};

export const orderColumns: ColumnDef<Order>[] = [
  {
    accessorKey: "activo",
    header: "Estado",
    cell: ({ row }) => {
      const isActive = row.getValue("activo") as boolean;
      const styles = isActive
        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
        : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
          {isActive ? "Activo" : "Inactivo"}
        </span>
      );
    },
  },
  {
    accessorKey: "persona_pagos",
    header: "Contacto",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("persona_pagos")}
      </span>
    ),
  },
  {
    accessorKey: "oc",
    header: "OC",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("oc")}
      </span>
    ),
  },
  {
    accessorKey: "uso_cfdi",
    header: "Uso CFDI",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("uso_cfdi")}
      </span>
    ),
  },
  {
    accessorKey: "gran_total",
    header: "Total",
    cell: ({ row }) => (
      <div className="text-right font-semibold text-slate-800 dark:text-slate-100">
        {formatCurrency(Number(row.original.gran_total) || 0)}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => (
      <div className="text-center" aria-label="Acciones de pedido">
        
      </div>
    ),
    size: 90,
    cell: ({ row }) => <ActionsCell order={row.original} />,
  },
];
