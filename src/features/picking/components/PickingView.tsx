"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
import { ListExportButtons } from "@/src/components/ListExportButtons";
import { useListExport } from "@/src/hooks/useListExport";
import { exportNum } from "@/src/utils/listExport";
import { hasPermission } from "@/src/utils/permissions";
import { PICKINGS_KEY } from "../constants/pickingsTable";
import { usePickingsResumen, usePickingsTable } from "../hooks/usePickingsTable";
import { getPickingColumns } from "./PickingColumns";
import { PickingDetailByIdDialog } from "./PickingDetailByIdDialog";
import { PickingForm } from "./PickingForm";
import { PickingStats } from "./PickingStats";
import { PICKING_EXPORT_COLUMNS } from "../utils/pickingExport";

/**
 * Surtidos en MODO SERVIDOR (nucleo-erp#1284): la lista ligera
 * (`?vista=lista`, sin `picking_detalle`) con filtros, búsqueda, orden y
 * página resueltos por el backend y guardados en la URL; la página la envuelve
 * en `<Suspense>`. Los KPIs salen de `resumen/` con los MISMOS criterios, así
 * cuentan todo el conjunto filtrado y no solo la página.
 *
 * El detalle se abre desde el folio y se trae por id (`PickingDetailByIdDialog`):
 * la fila ligera no trae las líneas. Su estado vive aquí, nunca en la celda.
 */
export function PickingView() {
  const table = usePickingsTable();
  const resumen = usePickingsResumen(table.criteria);
  const queryClient = useQueryClient();
  // Excel/PDF exportan TODO lo que cumple los filtros vigentes, no solo la página.
  const { exportCsv, exportPdf } = useListExport({
    getRows: table.fetchAllRows,
    columns: PICKING_EXPORT_COLUMNS,
    title: "Surtidos",
    fileName: "surtidos",
    summary: (rows) =>
      `${rows.length} surtido${rows.length === 1 ? "" : "s"} · ${rows
        .reduce((acc, r) => acc + exportNum(r.piezas), 0)
        .toLocaleString("es-MX")} pzas`,
  });

  // `hasPermission` ya cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-WMS-PICKING", session?.user);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // "Hoy" = el día de México con el que contó el backend: la urgencia de
  // entrega y "Surtidos hoy" miden contra el mismo día.
  const hoy = resumen.data?.surtidos_hoy.fecha ?? "";
  const columns = getPickingColumns(
    {
      onViewDetail: (id) => {
        setDetailId(id);
        setIsDetailOpen(true);
      },
    },
    hoy,
  );

  return (
    <div className="flex flex-col space-y-6">
      <div className="shrink-0">
        <PickingStats resumen={resumen.data} isFiltered={table.hasActiveCriteria} />
      </div>

      {/* Alto FIJO: en una laptop la tabla no se encoge por los KPIs; la página
          hace scroll (los KPIs pueden quedar fuera de vista). */}
      <div className="h-[44rem] flex flex-col">
        <DataTable
          columns={columns}
          {...table.tableProps}
          // Invalida el PREFIJO: lista, resumen y catálogos de filtros.
          onRefetch={() => queryClient.invalidateQueries({ queryKey: PICKINGS_KEY })}
          getRowId={(row) => String(row.id)}
          searchPlaceholder="Buscar surtido, pedido o cliente..."
          // El cuerpo llena el contenedor de alto fijo de arriba.
          fillHeight
          emptyMessage="No hay surtidos registrados."
          // Ver el listado exige `R-WMS-PICKING`; dar de alta exige además `C-WMS-PICKING`.
          actionButton={
            <div className="flex items-center gap-2 shrink-0">
              <ListExportButtons
                subject="surtidos"
                onExcel={() => void exportCsv()}
                onPdf={() => void exportPdf()}
              />
              {canCreate && <PickingForm />}
            </div>
          }
          errorTitle="Error al cargar los surtidos"
          loadingAriaLabel="Cargando surtidos"
        />
      </div>

      <PickingDetailByIdDialog orderId={detailId} open={isDetailOpen} onOpenChange={setIsDetailOpen} />
    </div>
  );
}
