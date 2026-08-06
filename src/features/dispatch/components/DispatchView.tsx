"use client";

import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { dispatchColumns } from "./DispatchColumns";
import { DispatchForm } from "./DispatchForm";
import { useDispatches } from "../hooks/useDispatches";

/**
 * Vista de Despacho: el listado (`GET /wms/despachos/`) con la captura de un
 * nuevo despacho (`POST /wms/despachos/`, ver `DispatchForm`) en el toolbar.
 * Todavía sin columna de acciones (no hay diálogo de detalle).
 *
 * `DataTable` se monta SIEMPRE (no se sustituye por un skeleton/ErrorState en
 * un ternario propio): recibe `isLoading`/`isError` y alterna internamente
 * solo su ÁREA DE DATOS, dejando el toolbar —y por tanto `DispatchForm`—
 * visible en su posición habitual durante la carga y el error. Mismo patrón
 * que `PackingView`/`PickingView`.
 */
export function DispatchView() {
  const { dispatches, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useDispatches();

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un refetch fallido con datos en caché conserva la tabla
  // y avisa por toast (ver `useDispatches`). Mismo criterio que `PackingView`.
  const showError = isInitialLoadError(isError, hasLoaded);

  return (
    <DataTable
      columns={dispatchColumns}
      data={dispatches}
      searchPlaceholder="Buscar packing, pedido, cliente, sucursal, envío o transportista..."
      getRowId={(row) => String(row.id)}
      onRefetch={refetch}
      isRefetching={isFetching}
      emptyMessage="No hay despachos registrados."
      actionButton={<DispatchForm />}
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar los despachos"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando despachos"
    />
  );
}
