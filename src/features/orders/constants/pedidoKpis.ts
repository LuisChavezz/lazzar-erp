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

/**
 * Por qué un importe de pedidos va como "No visible" (`HIDDEN_KPI_AMOUNT_TEXT`):
 * el usuario no cumple la regla de importes de pedidos (`puede_ver_importes`,
 * EC-784). Misma frase que la tarjeta "Valor total" de Mesa de Control.
 */
export const HIDDEN_PEDIDO_AMOUNTS_REASON = "Tu rol no tiene acceso a los importes de los pedidos.";
