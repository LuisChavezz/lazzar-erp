export type WmsAdjustmentReason =
  | "Conteo físico"
  | "Merma"
  | "Error sistema"
  | "Producto dañado";

export interface WmsAdjustment {
  id: string;
  producto: string;
  ubicacion: string;
  cantidadActual: number;
  cantidadCorrecta: number;
  motivo: WmsAdjustmentReason;
  usuario: string;
  createdAt: string;
}
