"use client";

import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { packingColumns } from "./PackingColumns";
import { PackingForm } from "./PackingForm";
import { PackingStats } from "./PackingStats";
import { usePackings } from "../hooks/usePackings";

/**
 * Vista de Packing: KPIs del listado (`PackingStats`) más el listado propio
 * (`GET /wms/packings/`), con la captura de un nuevo packing
 * (`POST /wms/packings/`, ver `PackingForm`) en el toolbar. El detalle de fila
 * vive en la columna de acciones ("Ver Detalles", ver
 * `PackingColumns`/`PackingDetailDialog`), sin fetch propio.
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

  return (
    <div className="space-y-6">
      {/* KPIs: ocultos durante la carga INICIAL y ante un error de carga —no
          hay datos que resumir—, igual que `PickingStats` en `PickingView`.
          `packings` arranca en `[]`, así que sin este gate las tarjetas
          mostrarían ceros que se leerían como datos reales. */}
      {!isLoading && !showError && <PackingStats items={packings} />}

      <DataTable
        columns={packingColumns}
        data={packings}
        searchPlaceholder="Buscar folio, picking, pedido u operador..."
        getRowId={(row) => String(row.id)}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay packings registrados."
        // Ver el listado exige `R-WMS-PACKING` (ver `routePermissions`); dar de
        // alta exige además `C-WMS-PACKING`.
        actionButton={canCreate ? <PackingForm /> : undefined}
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar los packings"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando packings"
      />
    </div>
  );
}
