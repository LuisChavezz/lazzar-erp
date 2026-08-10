"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getEmbroideryOrderColumns } from "./EmbroideryOrderColumns";
import { EmbroideryOrderDetailDialog } from "./EmbroideryOrderDetailDialog";
import { EmbroideryOrderForm } from "./EmbroideryOrderForm";
import { EmbroideryStats } from "./EmbroideryStats";
import { useEmbroideryOrders } from "../hooks/useEmbroideryOrders";

/**
 * Vista de Órdenes de Bordado: KPIs del listado (`EmbroideryStats`) más el
 * listado de `GET /produccion/orden-bordado/`, con el alta
 * (`POST /produccion/orden-bordado/onboarding/`, ver `EmbroideryOrderForm`) en
 * el toolbar y "Ver Detalles" por renglón (ver `EmbroideryOrderDetailDialog`,
 * que trae su propio detalle vía `GET /produccion/orden-bordado/{id}/` —ya no
 * se arma con la fila del listado, ver `useEmbroideryOrderDetail`).
 *
 * El diálogo de detalle se monta AQUÍ —fuera de `DataTable`, no dentro de la
 * fila que lo abrió— y se abre por `id` (`openOrderId`), no por el objeto de
 * fila. Es deliberado incluso siendo un diálogo de SOLO LECTURA —no hay riesgo
 * de que el diálogo mute el estado filtrable del renglón, `OrdenesBordado` no
 * tiene transición—: el motivo aquí es que el 409 de
 * duplicado al crear una orden trae el id de una orden existente
 * (`orden_bordado_existente.id`) que puede no corresponder a ninguna fila a la
 * vista. `setOpenOrderId` se reenvía por eso a `EmbroideryOrderForm` (el alta,
 * en el `actionButton` de abajo): el bloque ámbar del Paso 2 del asistente
 * (`EmbroideryOrderStep2`) abre este MISMO diálogo con ese id.
 * `EmbroideryView` es el único dueño de `openOrderId` — el alta solo recibe el
 * setter para invocarlo (y `onCloseExistingOrder` para limpiarlo al cerrarse),
 * no gestiona su propio estado de apertura.
 *
 * Sin edición ni transición de estatus en ningún punto: el backend no las
 * expone (`PUT`/`PATCH` → 405). Tampoco hay filtro por estatus (todas las
 * filas llegan en `1`/Pendiente) ni paginación (el endpoint devuelve el
 * arreglo completo).
 *
 * `DataTable` se monta SIEMPRE (no se sustituye por un skeleton/ErrorState en
 * un ternario propio): recibe `isLoading`/`isError` y alterna internamente
 * solo su ÁREA DE DATOS, dejando el toolbar —y por tanto el botón de alta—
 * visible durante la carga y el error. Mismo patrón que `PackingView`.
 */
export function EmbroideryView() {
  const { orders, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useEmbroideryOrders();
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un refetch fallido con datos en caché conserva la tabla y
  // avisa por toast (ver `useEmbroideryOrders`).
  const showError = isInitialLoadError(isError, hasLoaded);
  const columns = useMemo(() => getEmbroideryOrderColumns(setOpenOrderId), []);

  return (
    <div className="space-y-6">
      {/* KPIs: ocultos durante la carga INICIAL y ante un error de carga —no
          hay datos que resumir—, igual que `PickingStats`/`PackingStats` en
          sus vistas. `orders` arranca en `[]`, así que sin este gate las
          tarjetas mostrarían ceros que se leerían como datos reales.
          `DataTable` NO se gatea: se monta siempre y alterna solo su área de
          datos, de modo que el toolbar (y el botón de alta) permanece visible
          durante la carga y el error. */}
      {!isLoading && !showError && <EmbroideryStats items={orders} />}

      <DataTable
        columns={columns}
        data={orders}
        searchPlaceholder="Buscar folio, pedido u observaciones..."
        getRowId={(row) => String(row.id)}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay órdenes de bordado registradas."
        actionButton={
          <EmbroideryOrderForm
            onViewExistingOrder={setOpenOrderId}
            onCloseExistingOrder={() => setOpenOrderId(null)}
          />
        }
        // Un alta nueva se ordena al tope de la página 1 (ver
        // `useEmbroideryOrders`); sin esto, quien esté parado en la página 2 se
        // quedaría ahí y no vería la orden que acaba de crear, pese al toast
        // que le nombra el folio. `orders.length` solo cambia al aparecer o
        // desaparecer una orden, no al reordenar.
        paginationResetKey={orders.length}
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar las órdenes de bordado"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando órdenes de bordado"
      />

      {openOrderId !== null && (
        <EmbroideryOrderDetailDialog
          // El diálogo trae TODO su detalle por id, cobertura incluida: desde
          // que `list` y `retrieve` dejaron de compartir serializer, la fila
          // del listado ya no es el detalle (le faltan la parcialidad por
          // línea, las ubicaciones y las órdenes hermanas), y desde que
          // `OrdenBordadoRetrieveSerializer` pasó a heredar de
          // `OrdenBordadoListSerializer` en el backend, el `retrieve` también
          // declara `cobertura_completa`/`cantidad_cubierta`/
          // `cantidad_contratada` — ya no hace falta sacarlos de la fila que
          // abrió el diálogo. Ver `useEmbroideryOrderDetail`.
          orderId={openOrderId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenOrderId(null);
          }}
        />
      )}
    </div>
  );
}
