export type EmbroideryOrderStatus =
  | "Pendiente"
  | "En proceso"
  | "En revisión"
  | "Completado";

export interface EmbroideryOrderItem {
  id: string;
  pedido: string;
  cliente: string;
  fecha: string;
  estatus: EmbroideryOrderStatus;
  piezas: number;
  total: number;
}
