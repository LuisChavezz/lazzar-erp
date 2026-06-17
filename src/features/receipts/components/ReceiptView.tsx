"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { ReceiptStepManager } from "./ReceiptStepManager";
import { useReceipts } from "../hooks/useReceipts";
import { receiptColumns } from "./ReceiptColumns";
import { Loader } from "@/src/components/Loader";
import { ErrorDisplay } from "@/src/components/ui/ErrorDisplay";

// ─── View ──────────────────────────────────────────────────────────────────

export function ReceiptView() {
  const {
    data: receipts = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useReceipts();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const columns = useMemo(() => receiptColumns, []);

  // ── Loading state ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Loader
        title="Cargando recepciones..."
        className="py-20"
      />
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (isError) {
    return (
      <ErrorDisplay
        title="Error al cargar recepciones"
        error={error instanceof Error ? error : undefined}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPIs — pending implementation ─────────────────────────────── */}

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={receipts}
        searchPlaceholder="Buscar recepción..."
        onRefetch={refetch}
        isRefetching={isFetching}
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
