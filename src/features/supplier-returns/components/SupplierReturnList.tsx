"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { PlusIcon } from "@/src/components/Icons";
import { hasPermission } from "@/src/utils/permissions";
import { WmsCancelDialog } from "@/src/features/wms-cancellations/components/WmsCancelDialog";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { supplierReturnColumns } from "./SupplierReturnColumns";
import { SupplierReturnDetailDialog } from "./SupplierReturnDetailDialog";
import { SupplierReturnCreateDialog } from "./SupplierReturnCreateDialog";
import { SupplierReturnRowActionsProvider } from "../hooks/supplierReturnRowActionsContext";
import { useSupplierReturnsTable } from "../hooks/useSupplierReturnsTable";
import { SUPPLIER_RETURN_WRITE_PERMISSION, SUPPLIER_RETURNS_KEY } from "../constants/supplierReturns";
import { supplierReturnCancelDialogContent } from "../utils/supplierReturnActions";
import type { SupplierReturn } from "../interfaces/supplier-return.interface";

/**
 * Devoluciones a proveedor (EC-951) en MODO SERVIDOR: filtros, búsqueda, orden y
 * paginación los resuelve el backend y su estado vive en la URL
 * (`useSupplierReturnsTable`), así que la página lo envuelve en `<Suspense>`.
 *
 * Los diálogos (detalle, cancelar, alta) viven AQUÍ y no en la celda: la celda
 * se desmonta al refrescar, paginar u ordenar, y cancelar cambia el estatus de
 * la fila (puede salir de una vista filtrada por estatus con el diálogo
 * abierto). "Nueva devolución" y "Cancelar" exigen `C-WMS-RECEPCIONES`; sin él
 * la pantalla es de solo lectura.
 */
export function SupplierReturnList() {
  const table = useSupplierReturnsTable();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const canWrite = hasPermission(SUPPLIER_RETURN_WRITE_PERMISSION, session?.user);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // La devolución a cancelar, tal como estaba al abrir el diálogo.
  const [cancelTarget, setCancelTarget] = useState<SupplierReturn | null>(null);
  const cancelSession = useDialogSession(cancelTarget !== null, cancelTarget);

  return (
    <SupplierReturnRowActionsProvider
      value={{
        onViewDetail: (dev) => {
          setDetailId(dev.id);
          setIsDetailOpen(true);
        },
        onCancel: setCancelTarget,
        canWrite,
      }}
    >
      <DataTable
        columns={supplierReturnColumns}
        {...table.tableProps}
        onRefetch={() => queryClient.invalidateQueries({ queryKey: SUPPLIER_RETURNS_KEY })}
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar por folio, recepción, orden de compra o proveedor..."
        fillHeight
        actionButton={
          canWrite ? (
            <Button variant="primary" onClick={() => setIsCreateOpen(true)} className="shrink-0">
              <PlusIcon className="w-4 h-4" aria-hidden="true" />
              Nueva devolución
            </Button>
          ) : undefined
        }
        emptyMessage="Aún no hay devoluciones a proveedor"
        errorTitle="Error al cargar las devoluciones"
        loadingAriaLabel="Cargando devoluciones a proveedor"
      />

      <SupplierReturnDetailDialog returnId={detailId} open={isDetailOpen} onOpenChange={setIsDetailOpen} />

      {canWrite && (
        <SupplierReturnCreateDialog
          open={isCreateOpen}
          inspection={null}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(dev) => {
            setDetailId(dev.id);
            setIsDetailOpen(true);
          }}
        />
      )}

      {canWrite && cancelSession.snapshot && (
        <WmsCancelDialog
          key={cancelSession.id}
          content={supplierReturnCancelDialogContent(cancelSession.snapshot)}
          open={cancelTarget !== null}
          onOpenChange={(open) => {
            if (!open) setCancelTarget(null);
          }}
        />
      )}
    </SupplierReturnRowActionsProvider>
  );
}
