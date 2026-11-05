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
 * Una query toma el mayor `gcTime` de los observadores que la montaron, así
 * que en las llaves compartidas con otros módulos (la lista completa de pedidos,
 * `ordersQueryKey()`) solo lo pasan
 * los consumidores de esos dos módulos.
 */
export const LIST_QUERY_GC_TIME = 30 * 60 * 1000; // 30 minutos

/**
 * `staleTime` corto de los indicadores de Compras (órdenes de compra,
 * recepciones y proveedores, EC-771). El backend los CALCULA en cada lectura,
 * así que el `staleTime` global de 15 min mostraría cifras viejas al volver a
 * la pantalla; pero releerlos en CADA montaje repetía la petición al ir y venir
 * entre las pestañas de Compras. Con 30 s, volver enseguida usa la caché y
 * volver más tarde relee. Lo que cambia en esta sesión no espera a que venzan:
 * sus mutaciones invalidan la llave. Cabe en el `gcTime` default (5 min).
 */
export const KPI_QUERY_STALE_TIME = 30 * 1000; // 30 segundos

/**
 * `retry` por defecto del `QueryClient` (`Provider.tsx`). Exportado para que
 * las políticas de `retry` propias (`retryUnlessClientError`) sigan al global
 * en vez de copiar su número.
 */
export const DEFAULT_QUERY_RETRY = 1;
