"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/src/components/DataTable";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { ReceiptStepManager } from "./ReceiptStepManager";

// ─── Types ─────────────────────────────────────────────────────────────────

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
          <MainDialog
            title={
              <DialogHeader
                title="Nueva Recepción"
                subtitle="Recepcionar Orden de Compra"
                statusColor="sky"
              />
            }
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            maxWidth="640px"
            showCloseButton={true}
            trigger={
              <Button
                variant="primary"
                rounded="full"
                onClick={() => setIsDialogOpen(true)}
              >
                + Nueva Recepción
              </Button>
            }
          >
            <ReceiptStepManager onClose={() => setIsDialogOpen(false)} />
          </MainDialog>
        }
      />
    </div>
  );
}
