"use client";

import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { shipmentColumns } from "./ShippingColumns";
import { ShippingForm } from "./ShippingForm";
import { useShipments } from "../hooks/useShipments";

/**
 * Vista de Despacho: el listado (`GET /wms/despachos/`) con la captura de un
 * nuevo despacho (`POST /wms/despachos/`, ver `ShippingForm`) en el toolbar.
 * Todavía sin columna de acciones (no hay diálogo de detalle).
 *
 * `DataTable` se monta SIEMPRE (no se sustituye por un skeleton/ErrorState en
 * un ternario propio): recibe `isLoading`/`isError` y alterna internamente
 * solo su ÁREA DE DATOS, dejando el toolbar —y por tanto `ShippingForm`—
 * visible en su posición habitual durante la carga y el error. Mismo patrón
 * que `PackingView`/`PickingView`.
 */
export function ShippingView() {
  const { shipments, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useShipments();

  // `hasPermission` ya cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-WMS-ENVIO", session?.user);

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un refetch fallido con datos en caché conserva la tabla
  // y avisa por toast (ver `useShipments`). Mismo criterio que `PackingView`.
  const showError = isInitialLoadError(isError, hasLoaded);

  return (
    <DataTable
      columns={shipmentColumns}
      data={shipments}
      searchPlaceholder="Buscar packing, pedido, cliente, sucursal, guía o transportista..."
      getRowId={(row) => String(row.id)}
      onRefetch={refetch}
      isRefetching={isFetching}
      emptyMessage="No hay envíos registrados."
      // Ver el listado exige `R-WMS-ENVIO` (ver `routePermissions`); dar de alta
      // exige además `C-WMS-ENVIO`.
      actionButton={canCreate ? <ShippingForm /> : undefined}
      isLoading={isLoading}
      isError={showError}
      errorTitle="Error al cargar los envíos"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando envíos"
    />
  );
}
