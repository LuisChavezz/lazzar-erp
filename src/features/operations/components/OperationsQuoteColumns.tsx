"use client";

import { ColumnDef } from "@tanstack/react-table";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import {
  CheckCircleIcon,
  RejectIcon,
  SyncIcon,
  ViewIcon,
  WarehouseIcon,
} from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { capitalize } from "@/src/utils/capitalize";
import { formatCurrency } from "@/src/utils/formatCurrency";
import {
  canAcceptQuoteChanges as canAcceptOperationsQuoteChangesStatus,
  canManageQuoteAuthorization as canManageOperationsQuoteAuthorization,
} from "../../quotes/utils/quoteStatusRules";
import {
  formatQuoteDateTime as formatOperationsQuoteDateTime,
} from "../../quotes/utils/quoteDetailsFormatters";
import {
  getStatusStyles as getOperationsQuoteStatusStyles,
} from "../../quotes/utils/getStatusStyle";
import { QuoteDetailsLoadingSkeleton } from "../../quotes/components/QuoteDetailsLoadingSkeleton";
import { OperationsQuoteStockReviewDialog } from "./OperationsQuoteStockReviewDialog";
import { useAcceptChangesOperationsQuote } from "../hooks/useAcceptChangesOperationsQuote";
import { useApproveOperationsQuote } from "../hooks/useApproveOperationsQuote";
import { useRejectChangesOperationsQuote } from "../hooks/useRejectChangesOperationsQuote";
import { useRejectOperationsQuote } from "../hooks/useRejectOperationsQuote";
import { OperationsQuote } from "../interfaces/operations-quote.interface";

const OperationsQuoteDetails = dynamic(
  () =>
    import("../../quotes/components/QuoteDetails").then(
      (mod) => mod.QuoteDetails
    ),
  {
    ssr: false,
    loading: () => (
      <QuoteDetailsLoadingSkeleton ariaLabel="Cargando detalle de cotización operativa" />
    ),
  }
);

const operationsQuoteStatusDialogColors: Record<
  number,
  "sky" | "emerald" | "amber" | "rose"
> = {
  1: "amber",
  2: "sky",
  3: "emerald",
  4: "rose",
};

const ActionsCell = ({
  operationsQuote,
}: {
  operationsQuote: OperationsQuote;
}) => {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isStockReviewOpen, setIsStockReviewOpen] = useState(false);
  const [isAuthorizeOpen, setIsAuthorizeOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isAcceptChangesOpen, setIsAcceptChangesOpen] = useState(false);
  const [isRejectChangesOpen, setIsRejectChangesOpen] = useState(false);
  const {
    mutate: authorizeOperationsQuote,
    isPending: isAuthorizingOperationsQuote,
  } = useApproveOperationsQuote();
  const {
    mutate: rejectOperationsQuote,
    isPending: isRejectingOperationsQuote,
  } = useRejectOperationsQuote();
  const {
    mutate: acceptChangesOperationsQuote,
    isPending: isAcceptingChangesOperationsQuote,
  } = useAcceptChangesOperationsQuote();
  const {
    mutate: rejectChangesOperationsQuote,
    isPending: isRejectingChangesOperationsQuote,
  } = useRejectChangesOperationsQuote();

  const canAuthorizeOperationsQuote =
    canManageOperationsQuoteAuthorization(operationsQuote.estatus) &&
    operationsQuote.estatus === 2;
  const canAcceptOperationsQuoteChanges = canAcceptOperationsQuoteChangesStatus(
    operationsQuote.estatus
  );

  const handleOpenAuthorizeDialog = () => {
    if (!canAuthorizeOperationsQuote) return;
    setIsAuthorizeOpen(true);
  };

  const handleOpenRejectDialog = () => {
    if (!canAuthorizeOperationsQuote) return;
    setIsRejectOpen(true);
  };

  const handleOpenAcceptChangesDialog = () => {
    if (!canAcceptOperationsQuoteChanges) return;
    setIsAcceptChangesOpen(true);
  };

  const handleOpenRejectChangesDialog = () => {
    if (!canAcceptOperationsQuoteChanges) return;
    setIsRejectChangesOpen(true);
  };

  const handleAuthorize = () => {
    if (!canAuthorizeOperationsQuote) return;
    authorizeOperationsQuote(operationsQuote.id);
  };

  const handleReject = () => {
    if (!canAuthorizeOperationsQuote) return;
    rejectOperationsQuote(operationsQuote.id);
  };

  const handleAcceptChanges = () => {
    if (!canAcceptOperationsQuoteChanges) return;
    acceptChangesOperationsQuote(operationsQuote.id);
  };

  const handleRejectChanges = () => {
    if (!canAcceptOperationsQuoteChanges) return;
    rejectChangesOperationsQuote(operationsQuote.id);
  };

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: ViewIcon,
      onSelect: () => setIsViewOpen(true),
    },
    {
      label: "Revisar inventario",
      icon: WarehouseIcon,
      onSelect: () => setIsStockReviewOpen(true),
      permission: "R-MESACONTROL",
    },
    {
      label: "Autorizar",
      icon: CheckCircleIcon,
      onSelect: handleOpenAuthorizeDialog,
      disabled: isAuthorizingOperationsQuote || isRejectingOperationsQuote,
      permission: "R-MESACONTROL",
      visible: canAuthorizeOperationsQuote,
    },
    {
      label: "Rechazar",
      icon: RejectIcon,
      onSelect: handleOpenRejectDialog,
      disabled: isRejectingOperationsQuote || isAuthorizingOperationsQuote,
      permission: "R-MESACONTROL",
      visible: canAuthorizeOperationsQuote,
    },
    {
      label: "Aceptar cambios",
      icon: SyncIcon,
      onSelect: handleOpenAcceptChangesDialog,
      disabled:
        isAcceptingChangesOperationsQuote || isRejectingChangesOperationsQuote,
      permission: "R-MESACONTROL",
      visible: canAcceptOperationsQuoteChanges,
    },
    {
      label: "Rechazar cambios",
      icon: RejectIcon,
      onSelect: handleOpenRejectChangesDialog,
      disabled:
        isRejectingChangesOperationsQuote || isAcceptingChangesOperationsQuote,
      permission: "R-MESACONTROL",
      visible: canAcceptOperationsQuoteChanges,
    },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={items} ariaLabel="Acciones de cotización operativa" />

      {isViewOpen && (
        <MainDialog
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
          maxWidth="1000px"
          title={
            <DialogHeader
              title={`Detalles de la cotización #${operationsQuote.id}`}
              subtitle={
                operationsQuote.cliente_nombre ||
                operationsQuote.cliente_razon_social
              }
              statusColor={
                operationsQuoteStatusDialogColors[operationsQuote.estatus] ??
                "sky"
              }
            />
          }
        >
          <OperationsQuoteDetails quoteId={operationsQuote.id} />
        </MainDialog>
      )}

      {/* key={id+open} garantiza que el componente se remonte al abrir/cerrar el di\u00e1logo,
          reseteando el estado de selecciones de producci\u00f3n sin necesitar useEffect. */}
      <OperationsQuoteStockReviewDialog
        key={`stock-review-${operationsQuote.id}-${isStockReviewOpen}`}
        open={isStockReviewOpen}
        onOpenChange={setIsStockReviewOpen}
        operationsQuote={operationsQuote}
      />

      <ConfirmDialog
        open={isAuthorizeOpen && canAuthorizeOperationsQuote}
        onOpenChange={setIsAuthorizeOpen}
        title="Autorizar cotización operativa"
        description={`¿Deseas autorizar la cotización #${operationsQuote.id}?`}
        confirmText={
          isAuthorizingOperationsQuote ? "Autorizando..." : "Autorizar"
        }
        confirmColor="blue"
        onConfirm={handleAuthorize}
      />
      <ConfirmDialog
        open={isRejectOpen && canAuthorizeOperationsQuote}
        onOpenChange={setIsRejectOpen}
        title="Rechazar cotización operativa"
        description={`¿Deseas rechazar la cotización #${operationsQuote.id}?`}
        confirmText={
          isRejectingOperationsQuote ? "Rechazando..." : "Rechazar"
        }
        confirmColor="red"
        onConfirm={handleReject}
      />
      <ConfirmDialog
        open={isAcceptChangesOpen && canAcceptOperationsQuoteChanges}
        onOpenChange={setIsAcceptChangesOpen}
        title="Aceptar cambios de la cotización operativa"
        description={`¿Deseas aceptar los cambios de la cotización #${operationsQuote.id}?`}
        confirmText={
          isAcceptingChangesOperationsQuote ? "Aplicando..." : "Aceptar cambios"
        }
        confirmColor="green"
        onConfirm={handleAcceptChanges}
      />
      <ConfirmDialog
        open={isRejectChangesOpen && canAcceptOperationsQuoteChanges}
        onOpenChange={setIsRejectChangesOpen}
        title="Rechazar cambios de la cotización operativa"
        description={`¿Deseas rechazar los cambios de la cotización #${operationsQuote.id}?`}
        confirmText={
          isRejectingChangesOperationsQuote ? "Rechazando..." : "Rechazar cambios"
        }
        confirmColor="red"
        onConfirm={handleRejectChanges}
      />
    </div>
  );
};

export const operationsQuoteColumns: ColumnDef<OperationsQuote>[] = [
  {
    id: "id",
    accessorFn: (operationsQuote) =>
      `#${String(operationsQuote.id).padStart(5, "0")}`,
    meta: { label: "Cotización" },
    header: () => <div className="w-full text-center">Cotización</div>,
    cell: ({ row }) => (
      <span className="block text-center font-mono text-slate-600 dark:text-slate-300">
        #{String(row.original.id).padStart(5, "0")}
      </span>
    ),
  },
  {
    accessorKey: "estatus_label",
    meta: { label: "Estado" },
    header: () => <div className="w-full text-center">Estado</div>,
    cell: ({ row }) => {
      const styles = getOperationsQuoteStatusStyles(row.original);
      return (
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
          >
            {capitalize(row.original.estatus_label)}
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
    accessorKey: "persona_pagos",
    meta: { label: "Contacto" },
    header: () => <div className="w-full text-center">Contacto</div>,
    cell: ({ row }) => (
      <div className="text-center">
        <p className="text-slate-700 dark:text-slate-200 font-medium">
          {capitalize(row.original.persona_pagos)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {row.original.correo_facturas}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "piezas",
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
        {formatOperationsQuoteDateTime(
          row.original.created_at,
          "d MMM yyyy, HH:mm"
        )}
      </span>
    ),
  },
  {
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
    cell: ({ row }) => <ActionsCell operationsQuote={row.original} />,
  },
];