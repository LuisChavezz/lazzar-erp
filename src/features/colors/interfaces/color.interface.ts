export interface Color {
  id: number;
  nombre: string;
  /** Código corto (máx. 3). Forma parte del SKU generado por el backend. */
  codigo: string;
  codigo_hex: string;
}

export interface ColorCreate {
  nombre: string;
  codigo_hex: string;
}