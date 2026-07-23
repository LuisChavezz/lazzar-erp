"use client";

import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { pickingColumns } from "./PickingColumns";
import { PickingForm } from "./PickingForm";
import { PickingStats } from "./PickingStats";
import { usePickings } from "../hooks/usePickings";

/**
 * Vista de Picking: KPIs del listado (`PickingStats`) más el listado propio
 * (`GET /wms/pickings/`), con la captura de un nuevo picking
 * (`POST /wms/pickings/`, ver `PickingForm`) en el toolbar. Sin detalle de
 * fila más allá de "Ver Detalles" (ver `PickingColumns`).
 *
 * `DataTable` se monta SIEMPRE (no se sustituye por un skeleton/ErrorState en
 * un ternario propio): recibe `isLoading`/`isError` y alterna internamente
 * solo su ÁREA DE DATOS, dejando el toolbar —y por tanto `PickingForm`—
 * visible en su posición habitual durante la carga y el error. Mismo patrón
 * que `StockTransfersView`.
 */
export function PickingView() {
  const { pickings, isLoading, isError, error, hasLoaded, refetch, isFetching } = usePickings();

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un refetch fallido con datos en caché conserva la tabla
  // (y los KPIs) y avisa por toast (ver `usePickings`). Mismo criterio que
  // `AccountsReceivableList`.
  const showError = isInitialLoadError(isError, hasLoaded);

  return (
    <div className="space-y-6">
      {/* KPIs: ocultos durante la carga INICIAL y ante un error de carga —no
          hay datos que resumir—, igual que `OrderStats` en `PurchaseOrderView`.
          `pickings` arranca en `[]`, así que sin este gate las tarjetas
          mostrarían ceros que se leerían como datos reales. */}
      {!isLoading && !showError && <PickingStats items={pickings} />}

      <DataTable
        columns={pickingColumns}
        data={pickings}
        searchPlaceholder="Buscar folio, pedido, almacén u operador..."
        getRowId={(row) => String(row.id)}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay pickings registrados."
        actionButton={<PickingForm />}
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar los pickings"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando pickings"
      />
    </div>
  );
}
