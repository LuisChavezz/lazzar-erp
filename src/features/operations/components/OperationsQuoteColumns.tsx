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
  ViewIcon,
} from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { capitalize } from "@/src/utils/capitalize";
import { formatCurrency } from "@/src/utils/formatCurrency";
import {
  canManageQuoteAuthorization as canManageOperationsQuoteAuthorization,
} from "../../quotes/utils/quoteStatusRules";
import {
  formatQuoteDateTime as formatOperationsQuoteDateTime,
} from "../../quotes/utils/quoteDetailsFormatters";
import {
  getStatusStyles as getOperationsQuoteStatusStyles,
} from "../../quotes/utils/getStatusStyle";
import { useApproveOperationsQuote } from "../hooks/useApproveOperationsQuote";
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
      <div
        className="space-y-3"
        role="status"
        aria-live="polite"
        aria-label="Cargando detalle de cotización operativa"
      >
        <div className="h-16 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
        <div className="h-32 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
      </div>
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
  const [isAuthorizeOpen, setIsAuthorizeOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const {
    mutate: authorizeOperationsQuote,
    isPending: isAuthorizingOperationsQuote,
  } = useApproveOperationsQuote();
  const {
    mutate: rejectOperationsQuote,
    isPending: isRejectingOperationsQuote,
  } = useRejectOperationsQuote();

  const canManageOperationsAuthorization =
    canManageOperationsQuoteAuthorization(operationsQuote.estatus);

  const handleOpenAuthorizeDialog = () => {
    if (!canManageOperationsAuthorization) return;
    setIsAuthorizeOpen(true);
  };

  const handleOpenRejectDialog = () => {
    if (!canManageOperationsAuthorization) return;
    setIsRejectOpen(true);
  };

  const handleAuthorize = () => {
    if (!canManageOperationsAuthorization) return;
    authorizeOperationsQuote(operationsQuote.id);
  };

  const handleReject = () => {
    if (!canManageOperationsAuthorization) return;
    rejectOperationsQuote(operationsQuote.id);
  };

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: ViewIcon,
      onSelect: () => setIsViewOpen(true),
    },
    {
      label: "Autorizar",
      icon: CheckCircleIcon,
      onSelect: handleOpenAuthorizeDialog,
      disabled: isAuthorizingOperationsQuote || isRejectingOperationsQuote,
      permission: "R-MESACONTROL",
      visible: canManageOperationsAuthorization,
    },
    {
      label: "Rechazar",
      icon: RejectIcon,
      onSelect: handleOpenRejectDialog,
      disabled: isRejectingOperationsQuote || isAuthorizingOperationsQuote,
      permission: "R-MESACONTROL",
      visible: canManageOperationsAuthorization,
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

      <ConfirmDialog
        open={isAuthorizeOpen && canManageOperationsAuthorization}
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
        open={isRejectOpen && canManageOperationsAuthorization}
        onOpenChange={setIsRejectOpen}
        title="Rechazar cotización operativa"
        description={`¿Deseas rechazar la cotización #${operationsQuote.id}?`}
        confirmText={
          isRejectingOperationsQuote ? "Rechazando..." : "Rechazar"
        }
        confirmColor="red"
        onConfirm={handleReject}
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