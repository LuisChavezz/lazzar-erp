import type { DataTableFilterConfig } from "@/src/components/DataTable";
import {
  getPedidoClasificacionLabel,
  PEDIDO_CLASIFICACIONES,
} from "@/src/features/orders/constants/pedidoStatus";
import type { SpecialOrderListItem } from "../interfaces/special-order.interface";

/**
 * Campos DERIVADOS que consumen los chips de `DataTable`. Su filtro compara
 * `String(row[config.id])` contra el valor de la opción, así que no puede leer
 * `clasificacion` directo (`null` se volvería `"null"`) ni calcular el estado:
 * se precalculan aquí, igual que `withOrderStatus` en `SharedOrderColumns`.
 *
 * Solo filtran en memoria lo ya cargado; por defecto no ocultan nada.
 */
export const CLASIFICACION_FILTER_FIELD = "clasificacion_filtro" as const;
export const CONFIRMACION_FILTER_FIELD = "estado_confirmacion" as const;

/** Valor del chip para `clasificacion: null`. No colisiona con ningún código real (1 carácter). */
const SIN_CLASIFICACION = "SIN_CLASIFICACION";

export type SpecialOrderRow = SpecialOrderListItem & {
  [CLASIFICACION_FILTER_FIELD]: string;
  [CONFIRMACION_FILTER_FIELD]: string;
};

/** Un pedido se considera confirmado cuando ya tiene fecha de confirmación (mismo criterio que `isOrderConfirmed`). */
export const isSpecialOrderConfirmed = (order: SpecialOrderListItem): boolean =>
  Boolean(order.fecha_confirmacion);

export const withFilterFields = (orders: SpecialOrderListItem[]): SpecialOrderRow[] =>
  orders.map((order) => ({
    ...order,
    [CLASIFICACION_FILTER_FIELD]: order.clasificacion || SIN_CLASIFICACION,
    [CONFIRMACION_FILTER_FIELD]: isSpecialOrderConfirmed(order) ? "Confirmado" : "Por confirmar",
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
  {
    id: CONFIRMACION_FILTER_FIELD,
    label: "Estado",
    options: [
      { value: "Por confirmar", label: "Por confirmar" },
      { value: "Confirmado", label: "Confirmado" },
    ],
  },
];
