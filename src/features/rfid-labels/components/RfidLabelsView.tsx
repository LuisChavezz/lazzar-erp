"use client";

import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { rfidLabelColumns } from "./RfidLabelColumns";
import { RfidLabelCreateDialog } from "./RfidLabelCreateDialog";
import { useRfidLabels } from "../hooks/useRfidLabels";

const ESTADO_FILTER = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EXITO", label: "Éxito" },
  { value: "FALLIDO", label: "Fallido" },
];

/**
 * Vista de Etiquetas RFID: historial de impresión (`GET /wms/etiquetas-rfid/`),
 * con "Ver Detalles" por renglón (vista previa + ZPL, ver `RfidLabelDetailDialog`)
 * y "Nueva impresión" en el toolbar (`actionButton`), que abre el flujo de alta
 * (buscar → imprimir lote → registrar, ver `RfidLabelCreateDialog`). El registro
 * invalida `["etiquetas-rfid"]`, así que el nuevo evento aparece aquí solo.
 *
 * `DataTable` se monta SIEMPRE y recibe `isLoading`/`isError` en vez de
 * sustituirse por un skeleton/`ErrorState` en un ternario propio — mismo
 * patrón que `ShippingView`/`PackingView`.
 */
export function RfidLabelsView() {
  const { rfidLabels, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useRfidLabels();

  const showError = isInitialLoadError(isError, hasLoaded);

  // Ver el historial exige `R-WMS-ETIQUETAS` (ver `routePermissions`); registrar
  // una impresión exige además `C-WMS-ETIQUETAS`. `hasPermission` ya
  // cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-WMS-ETIQUETAS", session?.user);

  return (
    <DataTable
      columns={rfidLabelColumns}
      data={rfidLabels}
      searchPlaceholder="Buscar folio, SKU, producto o variante..."
      filterConfig={[{ id: "status", label: "Estatus", options: ESTADO_FILTER }]}
      getRowId={(row) => String(row.id)}
      onRefetch={refetch}
      isRefetching={isFetching}
      actionButton={canCreate ? <RfidLabelCreateDialog /> : undefined}
      emptyMessage="No hay impresiones registradas."
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar las impresiones"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando impresiones"
    />
  );
}
