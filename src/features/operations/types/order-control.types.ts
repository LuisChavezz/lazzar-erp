import type { Quote } from '@/src/features/quotes/interfaces/quote.interface';

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
export interface OrderControl extends Quote {
  folio: string;
  items: OrderControlItem[];
  stockStatus: OrderStockStatus;
  controlStatus: OrderControlStatus;
  deliveryDate: string | null;
}
