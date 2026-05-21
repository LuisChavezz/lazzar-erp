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

/** Estado de stock del pedido en la Mesa de Control */
export type OrderStockStatus = 'disponible' | 'parcial' | 'produccion';

/** Estado del flujo operativo del pedido */
export type OrderControlStatus =
  | 'pendiente'
  | 'stock_disponible'
  | 'requiere_produccion'
  | 'confirmado'
  | 'listo_para_liberar'
  | 'liberado';

/** Producto de una línea del pedido con disponibilidad en almacén */
export interface OrderControlItem {
  productoId: number;
  descripcion: string;
  unidad: string;
  cantidadSolicitada: number;
  stockDisponible: number;
  requiereProduccion: boolean;
}

/** Cotización/Pedido enriquecido con datos de stock para la Mesa de Control */
export interface OrderControl extends OrderControlQuoteSlice {
  folio: string;
  items: OrderControlItem[];
  stockStatus: OrderStockStatus;
  controlStatus: OrderControlStatus;
  deliveryDate: string | null;
}
