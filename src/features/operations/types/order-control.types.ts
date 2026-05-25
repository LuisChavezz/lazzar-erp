import type { OperationsQuote } from "../interfaces/operations-quote.interface";

type OrderControlQuoteSlice = Pick<
  OperationsQuote,
  | "id"
  | "estatus"
  | "estatus_label"
  | "cliente"
  | "cliente_nombre"
  | "cliente_razon_social"
  | "oc"
  | "uso_cfdi"
  | "gran_total"
  | "importe_sin_iva"
  | "piezas"
  | "autorizada_at"
  | "cambios_solicitados_at"
  | "created_at"
  | "updated_at"
>;

/** Estado del flujo operativo del pedido */
export type OrderControlStatus =
  | 'confirmado'
  | 'listo_para_liberar'
  | 'liberado';

/** Producto de una línea del pedido */
export interface OrderControlItem {
  productoId: number;
  descripcion: string;
  unidad: string;
  cantidadSolicitada: number;
}

/** Cotización/Pedido enriquecido para la Mesa de Control */
export interface OrderControl extends OrderControlQuoteSlice {
  folio: string;
  items: OrderControlItem[];
  controlStatus: OrderControlStatus;
  deliveryDate: string | null;
}
