"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { Order } from "../interfaces/order.interface";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { OrderDetails } from "./OrderDetails";
import {
  CheckCircleIcon,
  EmbarquesIcon,
  FacturacionIcon,
  RejectIcon,
  ViewIcon,
} from "../../../components/Icons";
import { formatCurrency } from "../../../utils/formatCurrency";
import { getStatusStyles } from "../utils/getStatusStyle";
import { formatOrderDateTime } from "../utils/orderDetailsFormatters";
import { useApproveOrder } from "../../operations/hooks/useApproveOrder";
import { useRejectOrder } from "../../operations/hooks/useRejectOrder";

const statusDialogColors: Record<number, "sky" | "emerald" | "amber" | "rose"> = {
  1: "amber",
  2: "sky",
  3: "emerald",
  4: "rose",
};

const ActionsCell = ({ order }: { order: Order }) => {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAuthorizeOpen, setIsAuthorizeOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const { mutate: authorizeOrder, isPending: isAuthorizingOrder } = useApproveOrder();
  const { mutate: rejectOrder, isPending: isRejectingOrder } = useRejectOrder();
  const canManageAuthorization = order.estatus === 2;
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
    {
      label: "Autorizar",
      icon: CheckCircleIcon,
      onSelect: () => setIsAuthorizeOpen(true),
      disabled: isAuthorizingOrder || isRejectingOrder,
      permission: "R-MESACONTROL",
      visible: canManageAuthorization,
    },
    {
      label: "Rechazar",
      icon: RejectIcon,
      onSelect: () => setIsRejectOpen(true),
      disabled: isRejectingOrder || isAuthorizingOrder,
      permission: "R-MESACONTROL",
      visible: canManageAuthorization,
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
              subtitle={order.cliente_nombre || order.cliente_razon_social}
              statusColor={statusDialogColors[order.estatus] ?? "sky"}
            />
          }
        >
          <OrderDetails orderId={order.id} />
        </MainDialog>
      )}
      <ConfirmDialog
        open={isAuthorizeOpen}
        onOpenChange={setIsAuthorizeOpen}
        title="Autorizar pedido"
        description={`¿Deseas autorizar el pedido #${order.id}?`}
        confirmText={isAuthorizingOrder ? "Autorizando..." : "Autorizar"}
        confirmColor="blue"
        onConfirm={() => authorizeOrder(order.id)}
      />
      <ConfirmDialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title="Rechazar pedido"
        description={`¿Deseas rechazar el pedido #${order.id}?`}
        confirmText={isRejectingOrder ? "Rechazando..." : "Rechazar"}
        confirmColor="red"
        onConfirm={() => rejectOrder(order.id)}
      />
    </div>
  );
};

export const orderColumns: ColumnDef<Order>[] = [
  {
    accessorKey: "estatus_label",
    meta: { label: "Estado" },
    header: () => <div className="w-full text-center">Estado</div>,
    cell: ({ row }) => {
      const styles = getStatusStyles(row.original);
      return (
        <div className="flex justify-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
            {row.original.estatus_label}
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
        {row.original.cliente_razon_social}
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
        {formatOrderDateTime(row.original.created_at, "d MMM yyyy, HH:mm")}
      </span>
    ),
  },
  {
    id: "importeSinIva",
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
    header: () => (
      <div className="text-center" aria-label="Acciones de pedido">
        
      </div>
    ),
    size: 90,
    cell: ({ row }) => <ActionsCell order={row.original} />,
  },
];
