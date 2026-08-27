"use client";

import { useSession } from "next-auth/react";
import { DataTable, type DataTableFilterConfig } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { pickingColumns } from "./PickingColumns";
import { PickingForm } from "./PickingForm";
import { PickingStats } from "./PickingStats";
import {
  PICKING_PRIORIDAD_CONFIG,
  PICKING_PRIORIDAD_ORDER,
} from "../constants/pickingPrioridad";
import { PICKING_STATUS_CONFIG } from "../constants/pickingStatus";
import { usePickings } from "../hooks/usePickings";
import { mapPickingsToRows } from "../utils/picking.utils";

// Opciones de filtro derivadas de los MISMOS catálogos que pintan los badges,
// para que un estatus o una prioridad no puedan existir en la tabla sin existir
// en el filtro (ni al revés). `DataTable` compara `String(fila[id]) === value`,
// así que los `value` son los strings exactos de la respuesta del backend.
const ESTADO_FILTER_OPTIONS = Object.entries(PICKING_STATUS_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label ?? value,
}));

const PRIORIDAD_FILTER_OPTIONS = PICKING_PRIORIDAD_ORDER.map((value) => ({
  value,
  label: PICKING_PRIORIDAD_CONFIG[value].label,
}));

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
 *
 * FILTRADO EN CLIENTE, a propósito: `GET /wms/pickings/` no acepta ningún
 * query param (el endpoint no declara parámetros y el backend no monta ningún
 * filter backend), así que mandarlos no filtraría nada. Como además el
 * endpoint devuelve la lista COMPLETA sin paginar, filtrar en memoria sobre
 * `rows` recorre exactamente el mismo universo de registros que filtraría el
 * servidor: el resultado es idéntico, no una aproximación sobre una página.
 * Si el backend llegara a paginar o a aceptar filtros, esto tendría que
 * moverse a params de `usePickings`.
 */
export function PickingView() {
  const {
    pickings,
    dataUpdatedAt,
    isLoading,
    isError,
    error,
    hasLoaded,
    refetch,
    isFetching,
  } = usePickings();

  // `hasPermission` ya cortocircuita para el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-WMS-PICKING", session?.user);

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un refetch fallido con datos en caché conserva la tabla
  // (y los KPIs) y avisa por toast (ver `usePickings`). Mismo criterio que
  // `AccountsReceivableList`.
  const showError = isInitialLoadError(isError, hasLoaded);

  // "Ahora" = el instante en que la query resolvió (`dataUpdatedAt`), UNO solo
  // para todas las filas: ninguna queda evaluada contra un instante distinto y,
  // a diferencia de un `Date.now()` en render, es una lectura pura —el React
  // Compiler prohíbe la impura— que además se reevalúa exactamente cuando llega
  // dato nuevo (refetch o botón de refrescar).
  //
  // Sigue siendo necesario aunque la tabla ya no muestre "Fecha Límite" ni
  // filtre por "Vencido": `PickingRow.esta_vencida` alimenta el mismo
  // resaltado en `PickingDetailDialog` (fuera de alcance de este cambio), que
  // recibe la fila enriquecida —no el registro crudo— para no divergir de la
  // definición de "vencido" en caso de que la columna regrese más adelante.
  const rows = mapPickingsToRows(pickings, dataUpdatedAt);

  const filterConfig: DataTableFilterConfig[] = [
    { id: "estado", label: "Estatus", options: ESTADO_FILTER_OPTIONS },
    { id: "prioridad", label: "Prioridad", options: PRIORIDAD_FILTER_OPTIONS },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs: ocultos durante la carga INICIAL y ante un error de carga —no
          hay datos que resumir—, igual que `OrderStats` en `PurchaseOrderView`.
          `pickings` arranca en `[]`, así que sin este gate las tarjetas
          mostrarían ceros que se leerían como datos reales. */}
      {!isLoading && !showError && <PickingStats items={pickings} />}

      {/* El placeholder de búsqueda NO menciona "almacén": la búsqueda global
          de `DataTable` usa el filtro por defecto de TanStack, que solo recorre
          columnas ACCESSOR, y la de almacén ya no existe — ofrecerla devolvería
          "sin resultados" sobre pickings que sí coinciden. */}
      <DataTable
        columns={pickingColumns}
        data={rows}
        searchPlaceholder="Buscar folio, pedido u operador..."
        filterConfig={filterConfig}
        getRowId={(row) => String(row.id)}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay pickings registrados."
        // Ver el listado exige `R-WMS-PICKING` (ver `routePermissions`); dar de
        // alta exige además `C-WMS-PICKING`.
        actionButton={canCreate ? <PickingForm /> : undefined}
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar los pickings"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando pickings"
      />
    </div>
  );
}
