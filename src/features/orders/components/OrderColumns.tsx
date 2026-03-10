"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { Order } from "../interfaces/order.interface";
import { getStatusStyles } from "../utils/getStatusStyle";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { OrderDetails } from "./OrderDetails";
import {
  EditIcon,
  EmbarquesIcon,
  FacturacionIcon,
  ViewIcon,
} from "../../../components/Icons";
import { formatCurrency } from "../../../utils/formatCurrency";

const statusLabels: Record<Order["estatusPedido"], string> = {
  Pendiente: "Pendiente",
  Parcial: "Parcial",
  Completo: "Completo",
  Cancelado: "Cancelado",
};

const statusDialogColors: Record<Order["estatusPedido"], "sky" | "emerald" | "amber" | "rose"> = {
  Pendiente: "amber",
  Parcial: "sky",
  Completo: "emerald",
  Cancelado: "rose",
};

const ActionsCell = ({ order }: { order: Order }) => {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const orderId = order.id;
  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: ViewIcon,
      onSelect: () => setIsViewOpen(true),
    },
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => {
        window.location.href = `/sales/orders/edit/${orderId}`;
      },
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
      <MainDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        maxWidth="1000px"
        title={
          <DialogHeader
            title={`Detalles del pedido ${order.folio}`}
            subtitle={order.clienteNombre}
            statusColor={statusDialogColors[order.estatusPedido]}
          />
        }
      >
        <OrderDetails order={order} />
      </MainDialog>
    </div>
  );
};

export const orderColumns: ColumnDef<Order>[] = [
  {
    accessorKey: "estatusPedido",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.getValue("estatusPedido") as Order["estatusPedido"];
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
            status
          )}`}
        >
          {statusLabels[status]}
        </span>
      );
    },
  },
  {
    accessorKey: "folio",
    header: "Folio",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("folio")}
      </span>
    ),
  },
  {
    accessorKey: "clienteNombre",
    header: "cliente",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("clienteNombre")}
      </span>
    ),
  },
  {
    accessorKey: "agente",
    header: "Agente",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("agente")}
      </span>
    ),
  },
  {
    accessorKey: "fecha",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">
        {row.getValue("fecha")}
      </span>
    ),
  },
  {
    id: "piezas",
    header: "Piezas",
    cell: ({ row }) => {
      const pieces = row.getValue("piezas") as number;
      return (
        <span className="text-slate-500 dark:text-slate-400">
          {pieces.toLocaleString("es-MX")}
        </span>
      );
    },
    accessorFn: (row) =>
      row.items.reduce((total, item) => total + item.cantidad, 0),
    sortingFn: "basic",
  },
  {
    accessorKey: "totals.subtotal",
    header: "Subtotal",
    cell: ({ row }) => (
      <div className="text-right font-medium text-slate-700 dark:text-slate-200">
        {formatCurrency(row.original.totals.subtotal)}
      </div>
    ),
  },
  {
    accessorKey: "totals.descuentoTotal",
    header: "Descuento",
    cell: ({ row }) => (
      <div className="text-right font-medium text-rose-500">
        -{formatCurrency(row.original.totals.descuentoTotal)}
      </div>
    ),
  },
  // {
  //   accessorKey: "totals.ivaAmount",
  //   header: "IVA",
  //   cell: ({ row }) => (
  //     <div className="text-right font-medium text-slate-700 dark:text-slate-200">
  //       {formatCurrency(row.original.totals.ivaAmount)}
  //     </div>
  //   ),
  // },
  {
    accessorKey: "totals.granTotal",
    header: "Total",
    cell: ({ row }) => (
      <div className="text-right font-semibold text-slate-800 dark:text-slate-100">
        {formatCurrency(row.original.totals.granTotal)}
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
