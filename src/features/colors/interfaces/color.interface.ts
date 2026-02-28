export interface Color {
  id: number;
  nombre: string;
  codigo_hex: string;
}

export interface ColorCreate {
  nombre: string;
  codigo_hex: string;
}