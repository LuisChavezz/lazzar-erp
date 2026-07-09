"use client";

import { useState } from "react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { CheckCircleIcon, DeleteIcon, EditIcon, ViewIcon } from "@/src/components/Icons";
import { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { PurchaseOrderDetailDialog } from "./PurchaseOrderDetailDialog";
import { PurchaseOrderEditDialog } from "./PurchaseOrderEditDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useConfirmPurchaseOrder } from "../hooks/useConfirmPurchaseOrder";
import { useDeletePurchaseOrder } from "../hooks/useDeletePurchaseOrder";
import {
  isPurchaseOrderEditable,
  PURCHASE_ORDER_ESTATUS_CFG,
  PURCHASE_ORDER_STATUS,
} from "../constants/purchaseOrderStatus";

const columnHelper = createColumnHelper<PurchaseOrder>();

// ── Subcomponente: badge de estatus ───────────────────────────────────────────

const EstatusBadge = ({ estatus, label }: { estatus: number; label: string }) => {
  const cfg =
    PURCHASE_ORDER_ESTATUS_CFG[estatus] ??
    PURCHASE_ORDER_ESTATUS_CFG[PURCHASE_ORDER_STATUS.BORRADOR];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
};

// ── Celda de acciones ─────────────────────────────────────────────────────────

/** Gestiona el menú de acciones y el diálogo de detalle de la orden */
const ActionsCell = ({ row }: { row: PurchaseOrder }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { mutate: confirmOrder, isPending } = useConfirmPurchaseOrder();
  const { mutate: deleteOrder, isPending: isDeletePending } = useDeletePurchaseOrder();

  // Borrador o pendiente: la orden aún no se autoriza, así que puede
  // editarse, confirmarse o eliminarse. Autorizada en adelante, ninguna de
  // las tres debe quedar disponible.
  const editable = isPurchaseOrderEditable(row.estatus);

  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => setIsDetailOpen(true),
    },
  ];

  if (editable) {
    menuItems.push({
      label: "Editar",
      icon: EditIcon,
      onSelect: () => setIsEditOpen(true),
    });
  }

  if (editable) {
    menuItems.push({
      label: "Confirmar",
      icon: CheckCircleIcon,
      onSelect: () => setIsConfirmOpen(true),
      disabled: isPending,
    });
  }

  if (editable) {
    menuItems.push({
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => setIsDeleteOpen(true),
      disabled: isDeletePending,
    });
  }

  return (
    <>
      <ActionMenu items={menuItems} ariaLabel={`Acciones de la orden ${row.folio}`} />
      <PurchaseOrderDetailDialog
        orderId={isDetailOpen ? row.id : null}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
      <PurchaseOrderEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialData={isEditOpen ? row : undefined}
      />
      {editable && (
        <ConfirmDialog
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          title="Confirmar Orden de Compra"
          description={`¿Estás seguro de que deseas confirmar la orden de compra #${row.id}? Esta acción no se puede deshacer.`}
          confirmText={isPending ? "Confirmando..." : "Confirmar"}
          confirmColor="blue"
          onConfirm={() => {
            confirmOrder(row.id);
            setIsConfirmOpen(false);
          }}
        />
      )}
      {editable && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Eliminar Orden de Compra"
          description={`¿Estás seguro de que deseas eliminar la orden de compra #${row.id}? Esta acción no se puede deshacer.`}
          confirmText={isDeletePending ? "Eliminando..." : "Eliminar"}
          confirmColor="red"
          onConfirm={() => {
            deleteOrder(row.id);
            setIsDeleteOpen(false);
          }}
        />
      )}
    </>
  );
};

export const getColumns = () => {
  const columns = [
    columnHelper.accessor("estatus", {
      header: "Estatus",
      cell: (info) => (
        <EstatusBadge estatus={info.getValue()} label={info.row.original.estatus_label} />
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
    columnHelper.accessor("proveedor_nombre", {
      header: "Proveedor",
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 text-sm">
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
      cell: (info) => {
        // `fecha_entrega_estimada` puede ser null (orden sin fecha de entrega);
        // se enlaza a una const para que TS lo estreche dentro del ternario.
        const value = info.getValue();
        return (
          <span className="text-slate-600 dark:text-slate-300 tabular-nums">
            {value ? new Date(value).toLocaleDateString("es-MX") : "—"}
          </span>
        );
      },
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
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <ActionsCell row={row.original} />
        </div>
      ),
    }),
  ] as ColumnDef<PurchaseOrder>[];

  return columns;
};

