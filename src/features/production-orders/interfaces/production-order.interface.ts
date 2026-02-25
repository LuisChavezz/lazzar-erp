export type ProductionOrderStatus =
  | "Pendiente"
  | "En proceso"
  | "En revisión"
  | "Completado";

export interface ProductionOrderItem {
  id: string;
  pedido: string;
  cliente: string;
  fecha: string;
  estatus: ProductionOrderStatus;
  piezas: number;
  total: number;
}
