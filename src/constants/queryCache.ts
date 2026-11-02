/**
 * `gcTime` largo para las listas y catálogos que cargan las pantallas de
 * Compras (EC-695). El global es el default de TanStack (5 min), MENOR que el
 * `staleTime` global de 15 min: una pantalla que se dejaba más de 5 min perdía
 * su caché aunque los datos siguieran frescos, y volver a ella repetía la
 * carga completa. Se fija SOLO en esas queries —no en llaves por término de
 * búsqueda ni en listas grandes por parámetro (p. ej. existencias por
 * almacén)—, que con un `gcTime` largo se acumularían en memoria.
 *
 * Una query toma el mayor `gcTime` de los observadores que la montaron, así
 * que en las llaves compartidas con otros módulos (`["orders"]`) solo lo pasan
 * los consumidores de Compras.
 */
export const PROCUREMENT_QUERY_GC_TIME = 30 * 60 * 1000; // 30 minutos
