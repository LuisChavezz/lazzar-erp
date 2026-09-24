import type { DataTableFilterConfig } from "@/src/components/DataTable";
import {
  getPedidoClasificacionLabel,
  PEDIDO_CLASIFICACIONES,
} from "@/src/features/orders/constants/pedidoStatus";
import {
  isOrderConfirmed,
  ORDER_STATUS_FILTER_FIELD,
  sharedOrderFilterConfig,
} from "@/src/features/orders/components/SharedOrderColumns";
import type { SpecialOrderListItem } from "../interfaces/special-order.interface";

/**
 * Campos DERIVADOS que consumen los chips de `DataTable`. Su filtro compara
 * `String(row[config.id])` contra el valor de la opción, así que no puede leer
 * `clasificacion` directo (`null` se volvería `"null"`) ni calcular el estado:
 * se precalculan aquí, igual que `enrichOrdersWithStatus` en
 * `SharedOrderColumns`, cuyo campo y chip de Estado se reutilizan tal cual.
 *
 * Solo filtran en memoria lo ya cargado; por defecto no ocultan nada.
 */
export const CLASIFICACION_FILTER_FIELD = "clasificacion_filtro" as const;

/** Valor del chip para `clasificacion: null`. No colisiona con ningún código real (1 carácter). */
const SIN_CLASIFICACION = "SIN_CLASIFICACION";

export type SpecialOrderRow = SpecialOrderListItem & {
  [CLASIFICACION_FILTER_FIELD]: string;
  [ORDER_STATUS_FILTER_FIELD]: string;
};

export const withFilterFields = (orders: SpecialOrderListItem[]): SpecialOrderRow[] =>
  orders.map((order) => ({
    ...order,
    [CLASIFICACION_FILTER_FIELD]: order.clasificacion || SIN_CLASIFICACION,
    [ORDER_STATUS_FILTER_FIELD]: isOrderConfirmed(order) ? "Confirmado" : "Por confirmar",
  }));

export const SPECIAL_ORDER_FILTER_CONFIG: DataTableFilterConfig[] = [
  {
    id: CLASIFICACION_FILTER_FIELD,
    label: "Clasificación",
    options: [
      ...PEDIDO_CLASIFICACIONES.map((codigo) => ({
        value: codigo,
        label: getPedidoClasificacionLabel(codigo),
      })),
      { value: SIN_CLASIFICACION, label: getPedidoClasificacionLabel(null) },
    ],
  },
  ...sharedOrderFilterConfig,
];
