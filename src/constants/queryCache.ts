/**
 * `gcTime` largo para las listas y catálogos que cargan las pantallas de
 * Compras (EC-695) y de Mesa de Control (EC-694). El global es el default de
 * TanStack (5 min), MENOR que el `staleTime` global de 15 min: una pantalla
 * que se dejaba más de 5 min perdía su caché aunque los datos siguieran
 * frescos, y volver a ella repetía la carga completa. Se fija SOLO en esas
 * queries —no en llaves por término de búsqueda ni en listas grandes por
 * parámetro (p. ej. existencias por almacén)—, que con un `gcTime` largo se
 * acumularían en memoria.
 *
 * Excepción en las listas en modo servidor (`useServerTable`, opción
 * `cacheDefaultView`): Mesa de Control, Compras › Pedidos y Recepciones de OC
 * lo aplican SOLO a la llave de su vista por defecto (página 1, sin filtros,
 * sin búsqueda, orden por defecto), que equivale a la única llave por pantalla
 * que cacheaban EC-694/695; cada combinación de filtros, búsqueda o página
 * conserva el global.
 *
 * Una query toma el mayor `gcTime` de los observadores que la montaron, así
 * que en las llaves compartidas con otros módulos (la lista completa de pedidos,
 * `ordersQueryKey()`) solo lo pasan
 * los consumidores de esos dos módulos.
 */
export const LIST_QUERY_GC_TIME = 30 * 60 * 1000; // 30 minutos

/**
 * `staleTime` corto de los indicadores de Compras de órdenes de compra y de
 * recepciones (EC-771). El backend los CALCULA en cada lectura, así que el
 * `staleTime` global de 15 min mostraría cifras viejas al volver a la
 * pantalla; pero releerlos en CADA montaje repetía la petición al ir y venir
 * entre las pestañas de Compras. Con 30 s, volver enseguida usa la caché y
 * volver más tarde relee. Lo que cambia en esta sesión no espera a que venzan:
 * sus mutaciones invalidan la llave. Cabe en el `gcTime` default (5 min).
 *
 * Los demás indicadores siguen con `refetchOnMount: "always"` a propósito: los
 * de pedidos, clientes y OP (`usePedidoKpis`, `useCustomerKpis`,
 * `useProductionOrderKpis`) porque pocas mutaciones —o ninguna de otros
 * módulos— invalidan su llave (p. ej. autorizar en Mesa de Control no toca
 * `["pedido-kpis"]`), y el ranking de proveedores (`useSupplierKpis`) para
 * cuadrar con su detalle por factor, que se lee fresco en cada apertura.
 */
export const PROCUREMENT_KPI_STALE_TIME = 30 * 1000; // 30 segundos

/**
 * `retry` por defecto del `QueryClient` (`Provider.tsx`). Exportado para que
 * las políticas de `retry` propias (`retryUnlessClientError`) sigan al global
 * en vez de copiar su número.
 */
export const DEFAULT_QUERY_RETRY = 1;
