"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
import { hasPermission } from "@/src/utils/permissions";
import { rfidLabelColumns } from "./RfidLabelColumns";
import { RfidLabelCreateDialog } from "./RfidLabelCreateDialog";
import { RfidLabelDetailDialog } from "./RfidLabelDetailDialog";
import { RfidLabelRowActionsProvider } from "../hooks/rfidLabelRowActionsContext";
import { useRfidLabelsTable } from "../hooks/useRfidLabelsTable";
import { RFID_LABELS_KEY } from "../constants/rfidLabelQueryKeys";

/**
 * Vista de Etiquetas RFID: historial de impresión (`GET /wms/etiquetas-rfid/`)
 * en MODO SERVIDOR: búsqueda, filtro de estatus, orden y paginación los
 * resuelve el backend y su estado vive en la URL (`useRfidLabelsTable`), así
 * que la página lo envuelve en `<Suspense>`.
 *
 * "Ver Detalles" abre `RfidLabelDetailDialog`, que pide el detalle por id (el
 * listado ya no trae EPC ni ZPL). El diálogo vive AQUÍ y no en la celda: la
 * celda se desmonta al refrescar, paginar u ordenar. "Nueva impresión" abre el
 * flujo de alta; el registro invalida `["etiquetas-rfid"]`, así que el nuevo
 * evento aparece aquí solo.
 */
export function RfidLabelsView() {
  const table = useRfidLabelsTable();
  const queryClient = useQueryClient();

  // Ver el historial exige `R-WMS-ETIQUETAS` (ver `routePermissions`); registrar
  // una impresión exige además `C-WMS-ETIQUETAS`. `hasPermission` ya
  // cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-WMS-ETIQUETAS", session?.user);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <RfidLabelRowActionsProvider
      value={{
        onViewDetail: (row) => {
          setDetailId(row.id);
          setIsDetailOpen(true);
        },
      }}
    >
      <div className="h-full flex flex-col min-h-0">
        <DataTable
          columns={rfidLabelColumns}
          {...table.tableProps}
          onRefetch={() => queryClient.invalidateQueries({ queryKey: RFID_LABELS_KEY })}
          searchPlaceholder="Buscar folio, SKU, producto o variante..."
          getRowId={(row) => String(row.id)}
          // El cuerpo llena el contenedor de altura acotada que da
          // `wms/rfid-labels/page.tsx`, en vez de reservar un alto fijo.
          fillHeight
          actionButton={canCreate ? <RfidLabelCreateDialog /> : undefined}
          emptyMessage="No hay impresiones registradas."
          errorTitle="Error al cargar las impresiones"
          loadingAriaLabel="Cargando impresiones"
        />
      </div>

      <RfidLabelDetailDialog etiquetaId={detailId} open={isDetailOpen} onOpenChange={setIsDetailOpen} />
    </RfidLabelRowActionsProvider>
  );
}
