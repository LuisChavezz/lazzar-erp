export interface WmsEntryItem {
  productoId: number;
  productoNombre: string;
  cantidad: number;
}

export interface WmsEntry {
  id: string;
  tipoMovimiento: string;
  fecha: string;
  referencia: string;
  proveedor: string;
  usuario: string;
  items: WmsEntryItem[];
  createdAt: string;
}
