export interface WmsOutputItem {
  productoId: number;
  productoNombre: string;
  cantidad: number;
}

export interface WmsOutput {
  id: string;
  tipoMovimiento: string;
  fecha: string;
  referencia: string;
  destino: string;
  usuario: string;
  items: WmsOutputItem[];
  createdAt: string;
}
