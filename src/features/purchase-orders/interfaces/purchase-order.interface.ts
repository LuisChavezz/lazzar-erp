export type PurchaseOrderStatus =
  | "Pendiente"
  | "En proceso"
  | "En revisión"
  | "Demorado"
  | "Acción requerida"
  | "Completado";

export interface PurchaseOrderItem {
  id: string;
  pedido: string;
  proveedor: string;
  fecha: string;
  estatus: PurchaseOrderStatus;
  piezas: number;
  total: number;
}
