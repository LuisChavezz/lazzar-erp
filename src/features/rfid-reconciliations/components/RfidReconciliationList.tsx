"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { PlusIcon } from "@/src/components/Icons";
import { hasPermission } from "@/src/utils/permissions";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { CancelReasonDialog } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { rfidReconciliationColumns } from "./RfidReconciliationColumns";
import { RfidReconciliationDetailDialog } from "./RfidReconciliationDetailDialog";
import { RfidReconciliationCreateDialog } from "./RfidReconciliationCreateDialog";
import { RfidReconciliationRowActionsProvider } from "../hooks/rfidReconciliationRowActionsContext";
import { useRfidReconciliationsTable } from "../hooks/useRfidReconciliationsTable";
import { RFID_RECONCILIATION_WRITE_PERMISSION, RFID_RECONCILIATIONS_KEY } from "../constants/rfidReconciliations";
import { rfidReconciliationCancelDialogContent } from "../utils/rfidReconciliationCancelAction";
import type { RfidReconciliationRow } from "../interfaces/rfid-reconciliation.interface";

/**
 * Encuadres RFID de recepción (EC-961) en MODO SERVIDOR: filtros, búsqueda,
 * orden y paginación los resuelve el backend y su estado vive en la URL
 * (`useRfidReconciliationsTable`), así que la página lo envuelve en
 * `<Suspense>`.
 *
 * Los diálogos (detalle, alta, cancelar) viven AQUÍ y no en la celda: la celda
 * se desmonta al refrescar, paginar u ordenar. "Nuevo encuadre" y "Cancelar"
 * exigen `C-WMS-RECEPCIONES`; sin él la pantalla es de solo lectura.
 */
export function RfidReconciliationList() {
  const table = useRfidReconciliationsTable();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const canWrite = hasPermission(RFID_RECONCILIATION_WRITE_PERMISSION, session?.user);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // El encuadre a cancelar, tal como estaba al abrir el diálogo.
  const [cancelTarget, setCancelTarget] = useState<RfidReconciliationRow | null>(null);
  const cancelSession = useDialogSession(cancelTarget !== null, cancelTarget);

  const openDetail = (id: number) => {
    setDetailId(id);
    setIsDetailOpen(true);
  };

  return (
    <RfidReconciliationRowActionsProvider
      value={{ onViewDetail: (row) => openDetail(row.id), onCancel: setCancelTarget, canWrite }}
    >
      <DataTable
        columns={rfidReconciliationColumns}
        {...table.tableProps}
        onRefetch={() => queryClient.invalidateQueries({ queryKey: RFID_RECONCILIATIONS_KEY })}
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar por OC, OP, proveedor, remisión o factura..."
        fillHeight
        actionButton={
          canWrite ? (
            <Button variant="primary" onClick={() => setIsCreateOpen(true)} className="shrink-0">
              <PlusIcon className="w-4 h-4" aria-hidden="true" />
              Nuevo encuadre
            </Button>
          ) : undefined
        }
        emptyMessage="Aún no hay encuadres RFID"
        errorTitle="Error al cargar los encuadres"
        loadingAriaLabel="Cargando encuadres RFID"
      />

      <RfidReconciliationDetailDialog reconciliationId={detailId} open={isDetailOpen} onOpenChange={setIsDetailOpen} />

      {canWrite && (
        <RfidReconciliationCreateDialog
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(created) => openDetail(created.id)}
        />
      )}

      {canWrite && cancelSession.snapshot && (
        <CancelReasonDialog
          key={cancelSession.id}
          content={rfidReconciliationCancelDialogContent(cancelSession.snapshot)}
          open={cancelTarget !== null}
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null);
          }}
        />
      )}
    </RfidReconciliationRowActionsProvider>
  );
}
