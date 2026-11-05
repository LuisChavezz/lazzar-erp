/**
 * Llave de los indicadores de órdenes de compra (`usePurchaseOrderKpis`),
 * DENTRO del prefijo `["purchase-orders"]` (como el historial por proveedor,
 * `["purchase-orders", "by-supplier", …]`): toda mutación que ya invalida ese
 * prefijo —alta, edición, confirmar, cancelar, eliminar, enviar correo,
 * recepciones e inspecciones de calidad— refresca también los indicadores, sin
 * que cada una tenga que acordarse. No choca con el detalle
 * `["purchase-orders", id]`: `id` es numérico.
 *
 * Vive en un archivo de constantes, y no en el hook, porque la página de
 * servidor `/procurement/purchase-orders` la pasa a `PurchaseOrderView` para
 * que "Actualizar datos" de la tabla también refresque las tarjetas: importar
 * el hook desde un Server Component arrastra `useEffect`/`useRef` y rompe la
 * página. Mismo motivo que `PEDIDO_KPIS_QUERY_KEY`.
 */
export const purchaseOrderKpisQueryKey = ["purchase-orders", "kpis"] as const;
