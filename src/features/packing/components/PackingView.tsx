"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { DataTable, type DataTableHandle } from "@/src/components/DataTable";
import { ListExportButtons } from "@/src/components/ListExportButtons";
import { useListExport } from "@/src/hooks/useListExport";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getPackingColumns } from "./PackingColumns";
import { PackingDetailDialog } from "./PackingDetailDialog";
import type { Packing } from "../interfaces/packing.interface";
import { PACKING_EXPORT_COLUMNS } from "../utils/packingExport";
import { PackingForm } from "./PackingForm";
import { PackingStats } from "./PackingStats";
import { usePackings } from "../hooks/usePackings";

/**
 * Vista de Packing: KPIs del listado (`PackingStats`) más el listado propio
 * (`GET /wms/packings/`), con la captura de un nuevo packing
 * (`POST /wms/packings/`, ver `PackingForm`) en el toolbar. El detalle de fila
 * se abre desde el folio o "Ver Detalles" (un solo `PackingDetailDialog`
 * aquí), sin fetch propio.
 *
 * `DataTable` se monta SIEMPRE (no se sustituye por un skeleton/ErrorState en
 * un ternario propio): recibe `isLoading`/`isError` y alterna internamente
 * solo su ÁREA DE DATOS, dejando el toolbar —y por tanto `PackingForm`—
 * visible en su posición habitual durante la carga y el error. Mismo patrón
 * que `PickingView`.
 */
export function PackingView() {
  const { packings, isLoading, isError, error, hasLoaded, refetch, isFetching } = usePackings();

  // `hasPermission` ya cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-WMS-PACKING", session?.user);

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un refetch fallido con datos en caché conserva la tabla
  // (y los KPIs) y avisa por toast (ver `usePackings`). Mismo criterio que
  // `PickingView`.
  const showError = isInitialLoadError(isError, hasLoaded);

  // Un solo diálogo de detalle (no uno por fila): su estado vive aquí.
  const [detail, setDetail] = useState<Packing | null>(null);
  const columns = getPackingColumns({ onViewDetail: setDetail });

  // Excel/PDF: EXACTAMENTE las filas que deja ver la tabla (filtros, búsqueda y orden).
  const tableRef = useRef<DataTableHandle<Packing>>(null);
  const { exportCsv, exportPdf } = useListExport({
    getRows: () => tableRef.current?.getFilteredRows() ?? [],
    columns: PACKING_EXPORT_COLUMNS,
    title: "Embarques",
    fileName: "embarques",
    summary: (rows) => `${rows.length} embarque${rows.length === 1 ? "" : "s"}`,
  });

  return (
    <div className="flex flex-col space-y-6">
      {/* KPIs: ocultos durante la carga INICIAL y ante un error de carga —no
          hay datos que resumir—, igual que `PickingStats` en `PickingView`.
          `packings` arranca en `[]`, así que sin este gate las tarjetas
          mostrarían ceros que se leerían como datos reales. `shrink-0`: solo
          la tabla de abajo debe crecer para llenar el espacio disponible. */}
      {!isLoading && !showError && (
        <div className="shrink-0">
          <PackingStats items={packings} />
        </div>
      )}

      {/* Alto FIJO: en una laptop la tabla no se encoge por los KPIs; la página
          hace scroll (los KPIs pueden quedar fuera de vista). */}
      <div className="h-[44rem] flex flex-col">
        <DataTable
          ref={tableRef}
          columns={columns}
          data={packings}
          searchPlaceholder="Buscar folio, surtido, pedido u operador..."
          getRowId={(row) => String(row.id)}
          // El cuerpo llena el contenedor de alto fijo de arriba.
          fillHeight
          onRefetch={refetch}
          isRefetching={isFetching}
          emptyMessage="No hay embarques registrados."
          // Ver el listado exige `R-WMS-PACKING` (ver `routePermissions`); dar de
          // alta exige además `C-WMS-PACKING`.
          actionButton={
            <div className="flex items-center gap-2 shrink-0">
              <ListExportButtons
                subject="embarques"
                onExcel={() => void exportCsv()}
                onPdf={() => void exportPdf()}
              />
              {canCreate && <PackingForm />}
            </div>
          }
          isLoading={isLoading}
          isError={showError}
          errorTitle="Error al cargar los embarques"
          errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
          loadingAriaLabel="Cargando embarques"
        />
      </div>

      {detail && (
        <PackingDetailDialog
          packing={detail}
          open={true}
          onOpenChange={(open) => {
            if (!open) setDetail(null);
          }}
        />
      )}
    </div>
  );
}
