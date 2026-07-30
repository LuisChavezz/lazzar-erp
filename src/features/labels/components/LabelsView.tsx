"use client";

import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { labelColumns } from "./LabelColumns";
import { useLabels } from "../hooks/useLabels";

const ESTADO_FILTER = [
  { value: "IMPRESA", label: "Impresa" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "REIMPRESION", label: "Reimpresión" },
];

/**
 * Vista de Etiquetas: listado de solo lectura con "Ver Detalles" por renglón
 * (vista previa + ZPL + estado de la impresora, ver `LabelDetailDialog`). Sin
 * `actionButton`: no hay alta ni edición, este módulo es una maqueta sobre
 * datos generados en local (ver `mocks/labels.mock.ts`).
 *
 * `DataTable` se monta SIEMPRE y recibe `isLoading`/`isError` en vez de
 * sustituirse por un skeleton/`ErrorState` en un ternario propio — mismo
 * patrón que `DispatchView`/`PackingView`. Aquí la "carga" es instantánea,
 * pero el cableado se conserva para que cambiar el `queryFn` de `useLabels`
 * por un endpoint real no obligue a tocar esta vista.
 */
export function LabelsView() {
  const { labels, isLoading, isError, error, hasLoaded, refetch, isFetching } = useLabels();

  const showError = isInitialLoadError(isError, hasLoaded);

  return (
    <DataTable
      columns={labelColumns}
      data={labels}
      title="Etiquetas"
      searchPlaceholder="Buscar SKU, producto o variante..."
      filterConfig={[{ id: "estado", label: "Última impresión", options: ESTADO_FILTER }]}
      getRowId={(row) => String(row.id)}
      onRefetch={refetch}
      isRefetching={isFetching}
      emptyMessage="No hay etiquetas registradas."
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar las etiquetas"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando etiquetas"
    />
  );
}
