/**
 * Rutas de clientes de Ventas: la única fuente de esas URLs (enlace de la fila,
 * "Volver" del detalle, accesos rápidos, búsqueda global, regreso desde el
 * pedido 360°). Sin dependencias, para que cualquier módulo la importe.
 */

/** Listado de clientes de Ventas. */
export const CUSTOMERS_LIST_PATH = "/sales/customers";

/** Detalle de un cliente (`/sales/customers/[id]`). */
export const customerDetailPath = (id: number | string) => `${CUSTOMERS_LIST_PATH}/${id}`;

/**
 * Parámetro de la URL del detalle con el estado del listado del que se llegó
 * (ver `utils/customerListQuery`). Mismo nombre que el de Oportunidades.
 */
export const CUSTOMER_LIST_PARAM = "lista";
