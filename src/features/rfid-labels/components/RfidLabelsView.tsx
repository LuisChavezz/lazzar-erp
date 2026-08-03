"use client";

import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { rfidLabelColumns } from "./RfidLabelColumns";
import { useRfidLabels } from "../hooks/useRfidLabels";

const ESTADO_FILTER = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EXITO", label: "Éxito" },
  { value: "FALLIDO", label: "Fallido" },
];

/**
 * Vista de Etiquetas RFID: historial de impresión (`GET /wms/etiquetas-rfid/`),
 * de solo lectura, con "Ver Detalles" por renglón (vista previa + ZPL, ver
 * `RfidLabelDetailDialog`). Sin `actionButton`: no hay alta desde aquí — crear
 * una impresión es un flujo aparte (fuera de alcance por ahora).
 *
 * `DataTable` se monta SIEMPRE y recibe `isLoading`/`isError` en vez de
 * sustituirse por un skeleton/`ErrorState` en un ternario propio — mismo
 * patrón que `DispatchView`/`PackingView`.
 */
export function RfidLabelsView() {
  const { rfidLabels, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useRfidLabels();

  const showError = isInitialLoadError(isError, hasLoaded);

  return (
    <DataTable
      columns={rfidLabelColumns}
      data={rfidLabels}
      searchPlaceholder="Buscar folio, SKU, producto o variante..."
      filterConfig={[{ id: "status", label: "Estatus", options: ESTADO_FILTER }]}
      getRowId={(row) => String(row.id)}
      onRefetch={refetch}
      isRefetching={isFetching}
      emptyMessage="No hay impresiones registradas."
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar las impresiones"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando impresiones"
    />
  );
}
