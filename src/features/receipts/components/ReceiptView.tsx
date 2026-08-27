"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { ReceiptStepManager } from "./ReceiptStepManager";
import { useReceipts } from "../hooks/useReceipts";
import { receiptColumns } from "./ReceiptColumns";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";

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

  // Ver el listado exige `R-WMS-RECEPCIONES` (ver `routePermissions`); dar de
  // alta exige además `C-WMS-RECEPCIONES`. `hasPermission` ya cortocircuita
  // para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-WMS-RECEPCIONES", session?.user);
  const columns = useMemo(() => receiptColumns, []);

  return (
    <div className="space-y-6">
      {/* ── KPIs — pending implementation ─────────────────────────────── */}

      {/* ── Table ──────────────────────────────────────────────────────────
          La tabla se monta SIEMPRE: su cuerpo alterna carga/error/tabla y su
          toolbar (con "Nueva Recepción") permanece disponible. El estado de
          error ofrece "Reintentar" vía `onErrorRetry` —misma capacidad que el
          `ErrorDisplay` que antes se mostraba a pantalla completa, pero
          conservando el toolbar—. */}
      <DataTable
        columns={columns}
        data={receipts}
        searchPlaceholder="Buscar recepción..."
        onRefetch={refetch}
        isRefetching={isFetching}
        isLoading={isLoading}
        isError={isError}
        errorTitle="Error al cargar recepciones"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando recepciones"
        actionButton={
          canCreate ? (
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
          ) : undefined
        }
      />
    </div>
  );
}
