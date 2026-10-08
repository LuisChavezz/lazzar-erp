/**
 * Llave de los indicadores de "Mis pedidos" (`usePedidoKpis`). Propia y FUERA
 * del prefijo `["orders"]`: los indicadores no se derivan del listado, y las
 * mutaciones que invalidan `["orders"]` por prefijo no tienen por qué
 * refetchearlos (el hook ya refetchea al montar).
 *
 * Vive en un archivo de constantes, y no en el hook, porque la página de
 * servidor `/sales/orders` la pasa a `OrderListView` para que el refresco de la
 * tabla también refresque las tarjetas.
 */
export const PEDIDO_KPIS_QUERY_KEY = ["pedido-kpis"] as const;
