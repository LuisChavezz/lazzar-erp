"use client";

import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { packingColumns } from "./PackingColumns";
import { PackingForm } from "./PackingForm";
import { usePackings } from "../hooks/usePackings";

/**
 * Vista de Packing: el listado (`GET /wms/packings/`) más la captura de un
 * nuevo packing (`POST /wms/packings/`, ver `PackingForm`) en el toolbar. El
 * detalle de fila vive en la columna de acciones ("Ver Detalles", ver
 * `PackingColumns`/`PackingDetailDialog`), sin fetch propio. Sin KPIs —pieza
 * de una tarea futura separada, igual que ocurrió con `PickingStats` en su
 * momento—.
 *
 * `DataTable` se monta SIEMPRE (no se sustituye por un skeleton/ErrorState en
 * un ternario propio): recibe `isLoading`/`isError` y alterna internamente
 * solo su ÁREA DE DATOS, dejando el toolbar —y por tanto `PackingForm`—
 * visible en su posición habitual durante la carga y el error. Mismo patrón
 * que `PickingView`.
 */
export function PackingView() {
  const { packings, isLoading, isError, error, hasLoaded, refetch, isFetching } = usePackings();

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un refetch fallido con datos en caché conserva la tabla
  // y avisa por toast (ver `usePackings`). Mismo criterio que `PickingView`.
  const showError = isInitialLoadError(isError, hasLoaded);

  return (
    <DataTable
      columns={packingColumns}
      data={packings}
      searchPlaceholder="Buscar folio, picking, pedido u operador..."
      getRowId={(row) => String(row.id)}
      onRefetch={refetch}
      isRefetching={isFetching}
      emptyMessage="No hay packings registrados."
      actionButton={<PackingForm />}
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar los packings"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando packings"
    />
  );
}
