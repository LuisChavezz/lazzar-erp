"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/src/components/DataTable";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { ReceiptPurchaseOrderSelector } from "./ReceiptPurchaseOrderSelector";
import ReceiptForm from "./ReceiptForm";
import type { PurchaseOrder } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";

// ─── Types ─────────────────────────────────────────────────────────────────

type DialogView = "closed" | "selector" | "form";

/** Placeholder receipt type — will be replaced once the domain model is defined. */
interface Receipt {
  id: number;
  folio: string;
  proveedor: string;
  fecha: string;
  total: number;
  estatus: string;
}

// ─── Columns ───────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Receipt>();

const columns = [
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
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("fecha", {
    header: "Fecha",
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
  columnHelper.accessor("estatus", {
    header: "Estatus",
    cell: (info) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400">
        {info.getValue()}
      </span>
    ),
  }),
] as ColumnDef<Receipt>[];

// ─── View ──────────────────────────────────────────────────────────────────

export function ReceiptView() {
  const [dialogView, setDialogView] = useState<DialogView>("closed");
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null);

  const isSelectorOpen = dialogView === "selector";
  const isFormOpen = dialogView === "form";

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleOpenSelector = () => {
    setSelectedPurchaseOrder(null);
    setDialogView("selector");
  };

  const handleContinue = () => {
    if (!selectedPurchaseOrder) return;
    setDialogView("form");
  };

  const handleCloseSelector = (open: boolean) => {
    if (!open && dialogView === "selector") {
      setDialogView("closed");
    }
  };

  const handleCloseForm = (open: boolean) => {
    if (!open) {
      setDialogView("closed");
      setSelectedPurchaseOrder(null);
    }
  };

  const handleFormSuccess = () => {
    setDialogView("closed");
    setSelectedPurchaseOrder(null);
  };

  // Empty data — no receipts available yet
  const data: Receipt[] = useMemo(() => [], []);

  return (
    <div className="space-y-6">
      {/* ── KPIs — pending implementation ─────────────────────────────── */}

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Buscar recepción..."
        actionButton={
          <>
            {/* ── Dialog 1: Purchase Order Selector ──────────────────── */}
            <MainDialog
              title={
                <DialogHeader
                  title="Nueva Recepción"
                  subtitle="Seleccionar Orden de Compra"
                  statusColor="sky"
                />
              }
              open={isSelectorOpen}
              onOpenChange={handleCloseSelector}
              maxWidth="640px"
              showCloseButton={false}
              actionButtonClose={false}
              actionButton={
                <Button
                  variant="primary"
                  rounded="xl"
                  disabled={!selectedPurchaseOrder}
                  onClick={handleContinue}
                >
                  Continuar
                </Button>
              }
              trigger={
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleOpenSelector}
                >
                  + Nueva Recepción
                </Button>
              }
            >
              <ReceiptPurchaseOrderSelector
                selectedOrderId={selectedPurchaseOrder?.id ?? null}
                onSelect={(order) => {
                  setSelectedPurchaseOrder(order);
                }}
              />
            </MainDialog>

            {/* ── Dialog 2: Receipt Form ─────────────────────────────── */}
            <MainDialog
              title={
                <DialogHeader
                  title="Nueva Recepción"
                  subtitle="Registrar Recepción"
                  statusColor="sky"
                />
              }
              open={isFormOpen}
              onOpenChange={handleCloseForm}
              maxWidth="640px"
              showCloseButton={true}
            >
              {selectedPurchaseOrder && (
                <ReceiptForm
                  onSuccess={handleFormSuccess}
                  purchaseOrder={selectedPurchaseOrder}
                />
              )}
            </MainDialog>
          </>
        }
      />
    </div>
  );
}
