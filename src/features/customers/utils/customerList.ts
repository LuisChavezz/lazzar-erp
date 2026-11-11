import type { QueryClient } from "@tanstack/react-query";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import { defineServerTable } from "@/src/utils/serverTableParams";
import type { CustomerListItem } from "../interfaces/customer.interface";

/**
 * Prefijo de la tabla de clientes de Ventas: vive en
 * `["customers", "list", params]` (`useServerTable` añade `"list"` y los
 * parámetros). El CATÁLOGO completo sigue en la llave EXACTA `["customers"]`
 * (`useCustomers`: filtro de encabezado y formulario de Oportunidades,
 * factura pendiente de CxC) y esta tabla nunca la escribe. Alta y edición
 * invalidan el prefijo `["customers"]`, así que refrescan las dos.
 */
export const CUSTOMERS_TABLE_KEY = ["customers"] as const;

/**
 * Contrato del listado con `GET /terceros/clientes/` (EC-757 / EC-853).
 *
 * - Solo búsqueda y orden: el endpoint no acepta filtros (un parámetro
 *   desconocido se ignora) y ya lista solo activos, así que la tabla no ofrece
 *   ninguno.
 * - `search`: razón social, nombre, RFC, clave, correo y teléfono (tal cual se
 *   guardó). Cada palabra se busca como subcadena y deben coincidir todas.
 * - `ordering`: los campos de las columnas, todos en la lista blanca del
 *   backend. `fecha_ultima_compra` deja los clientes sin compras al final en
 *   ambas direcciones. El default es la primera columna (razón social), no
 *   el del backend (`nombre, id`): la vista inicial se lee ordenada por lo que
 *   se ve primero, con la flecha en esa columna.
 */
export const customersTable = defineServerTable({
  filters: {},
  search: { param: "search" },
  ordering: {
    fields: ["razon_social", "nombre", "telefono", "correo", "fecha_ultima_compra"],
    default: "razon_social",
    tiebreaker: "-id",
  },
});

/** Texto de un cliente sin compras: celda y exportaciones dicen lo mismo. */
export const SIN_COMPRAS_LABEL = "Sin compras";

/**
 * "Última Compra" como texto: el día de `fecha_ultima_compra` ("14 jul 2026")
 * leído como fecha-calendario (sin pasar por medianoche UTC, EC-558);
 * `SIN_COMPRAS_LABEL` si es `null` (el cliente nunca ha comprado) y "—" si el
 * campo no viene o no es una fecha válida.
 */
export const formatUltimaCompra = (value: string | null | undefined): string =>
  value === null ? SIN_COMPRAS_LABEL : formatShortCalendarDate(value);

/**
 * Busca un cliente en las páginas cacheadas de la tabla
 * (`["customers", "list", …]`). Solo LEE la caché. Una entrada que no sea una
 * página (el marcador de "página que ya no existe" de `useServerTable`) se
 * ignora. El id se compara como texto: `Customer.id` está tipado `string` pero
 * el backend manda un número.
 */
export const findCustomerInListPages = (
  queryClient: QueryClient,
  customerKey: string,
): CustomerListItem | undefined => {
  for (const [, page] of queryClient.getQueriesData<Partial<PaginatedListResponse<CustomerListItem>>>({
    queryKey: [...CUSTOMERS_TABLE_KEY, "list"],
  })) {
    const match = Array.isArray(page?.results)
      ? page.results.find((item) => String(item.id) === customerKey)
      : undefined;
    if (match) return match;
  }
  return undefined;
};
