"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getCorteMangaOrderColumns } from "./CorteMangaOrderColumns";
import { CorteMangaOrderDetailDialog } from "./CorteMangaOrderDetailDialog";
import { CorteMangaOrderForm } from "./CorteMangaOrderForm";
import { CorteMangaOrderStats } from "./CorteMangaOrderStats";
import { useCorteMangaOrders } from "../hooks/useCorteMangaOrders";

/**
 * Vista de Órdenes de Corte de Manga: KPIs del listado
 * (`CorteMangaOrderStats`) más el listado de
 * `GET /produccion/orden-corte-manga/`, con el alta
 * (`POST /produccion/orden-corte-manga/onboarding/`, ver `CorteMangaOrderForm`)
 * en el toolbar y "Ver Detalles" por renglón (ver
 * `CorteMangaOrderDetailDialog`, sin fetch propio).
 *
 * El diálogo de detalle se monta AQUÍ —fuera de `DataTable`, no dentro de la
 * fila que lo abrió— y se abre por `id` (`openOrderId`), no por el objeto de
 * fila. Es deliberado incluso siendo un diálogo de SOLO LECTURA, por dos
 * motivos:
 *  1. El 409 de duplicado al crear una orden trae el id de una orden existente
 *     (`orden_corte_manga_existente.id`) que puede no corresponder a ninguna
 *     fila a la vista — puede haberla creado otro usuario, o ser una fila
 *     histórica de la generación automática desde ventas.
 *  2. Montado en la celda, un refetch del listado (o cualquier cosa que
 *     reordene las filas) desmontaría el diálogo a media lectura. Con el estado
 *     aquí arriba y `getRowId` atando la identidad al dato, eso no puede pasar.
 * `setOpenOrderId` se reenvía por lo primero a `CorteMangaOrderForm` (el alta,
 * en el `actionButton` de abajo): el bloque ámbar de
 * `CorteMangaOrderCreateForm` abre este MISMO diálogo con ese id.
 * `CorteMangaOrdersView` es el único dueño de `openOrderId` — el alta solo
 * recibe el setter para invocarlo (y `onCloseExistingOrder` para limpiarlo al
 * cerrarse), no gestiona su propio estado de apertura.
 *
 * APILADO DE DIÁLOGOS: el detalle queda ENCIMA del alta, no al revés. Ambos son
 * `MainDialog` (`Dialog.Root` de Radix) independientes que se portalizan a
 * `document.body` en orden de MONTAJE; el del alta se monta con el toolbar de
 * `DataTable` —arriba en este mismo árbol— y el del detalle solo cuando
 * `openOrderId !== null`, es decir siempre después, así que su portal se
 * agrega al final del `body` y gana el apilado. Mismo orden de montaje —y mismo
 * resultado— que en `ReflectiveOrdersView`/`EmbroideryView`.
 *
 * Sin edición ni transición de estatus en ningún punto: el backend no las
 * expone (`estatus_corte` es `read_only` y `PUT`/`PATCH` → 405). El `DELETE`
 * (soft delete) SÍ existe en el API pero no se expone aquí, igual que en
 * reflejante y bordado. Tampoco hay paginación (el endpoint devuelve el arreglo
 * completo, sin envoltorio `count`/`results`).
 *
 * SIN `filterConfig`: los dos ejes que serían candidatos naturales —estatus y
 * prioridad— valen lo mismo en TODAS las filas hoy (`1`/Pendiente y `1`/Alta,
 * ver `CorteMangaOrderStats`), así que un filtro por ellos ofrecería una sola
 * opción que no descarta nada. La búsqueda global del toolbar ya cubre folio,
 * pedido, sucursal, operador y observaciones. Mismo criterio que
 * `ReflectiveOrdersView`/`EmbroideryView`.
 *
 * `DataTable` se monta SIEMPRE (no se sustituye por un skeleton/ErrorState en
 * un ternario propio): recibe `isLoading`/`isError` y alterna internamente solo
 * su ÁREA DE DATOS, dejando el toolbar —y por tanto el botón de alta— visible
 * durante la carga y el error. Mismo patrón que
 * `ReflectiveOrdersView`/`EmbroideryView`/`PackingView`.
 */
export function CorteMangaOrdersView() {
  const { orders, isLoading, isError, error, hasLoaded, refetch, isFetching } =
    useCorteMangaOrders();
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);

  // Solo se trata como error "de pantalla completa" cuando la consulta nunca
  // cargó con éxito; un refetch fallido con datos en caché conserva la tabla y
  // avisa por toast (ver `useCorteMangaOrders`).
  const showError = isInitialLoadError(isError, hasLoaded);
  const columns = useMemo(() => getCorteMangaOrderColumns(setOpenOrderId), []);

  return (
    <div className="space-y-6">
      {/* KPIs: ocultos durante la carga INICIAL y ante un error de carga —no
          hay datos que resumir—, igual que `ReflectiveOrderStats`/
          `EmbroideryStats` en sus vistas. `orders` arranca en `[]`, así que sin
          este gate las tarjetas mostrarían ceros que se leerían como datos
          reales. `DataTable` NO se gatea: se monta siempre y alterna solo su
          área de datos, de modo que el toolbar (y el botón de alta) permanece
          visible durante la carga y el error. */}
      {!isLoading && !showError && <CorteMangaOrderStats items={orders} />}

      <DataTable
        columns={columns}
        data={orders}
        searchPlaceholder="Buscar folio, pedido, sucursal, operador u observaciones..."
        getRowId={(row) => String(row.id)}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay órdenes de corte de manga registradas."
        actionButton={
          <CorteMangaOrderForm
            onViewExistingOrder={setOpenOrderId}
            onCloseExistingOrder={() => setOpenOrderId(null)}
          />
        }
        // Un alta nueva se ordena al tope de la página 1 (ver
        // `useCorteMangaOrders`); sin esto, quien esté parado en la página 2 se
        // quedaría ahí y no vería la orden que acaba de crear, pese al toast
        // que le nombra el folio. `orders.length` solo cambia al aparecer o
        // desaparecer una orden, no al reordenar.
        paginationResetKey={orders.length}
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar las órdenes de corte de manga"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando órdenes de corte de manga"
      />

      {openOrderId !== null && (
        <CorteMangaOrderDetailDialog
          // La búsqueda se hace aquí, contra el arreglo que esta vista ya
          // tiene: el diálogo no vuelve a suscribirse a la query solo para
          // localizar un renglón. `null` (id sin correspondencia en la lista)
          // es el caso que el diálogo pinta como "no encontrada" — y es también
          // el respaldo del enlace del 409 cuando la orden existente todavía no
          // está en la caché recién invalidada.
          order={orders.find((order) => order.id === openOrderId) ?? null}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenOrderId(null);
          }}
        />
      )}
    </div>
  );
}
