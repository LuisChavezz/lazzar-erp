export interface WmsOutputItem {
  stockId: number;
  productoNombre: string;
  almacenNombre: string;
  ubicacionNombre: string;
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
