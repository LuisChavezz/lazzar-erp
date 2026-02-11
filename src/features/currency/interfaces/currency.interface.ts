export interface Currency {
  id: number;
  codigo_iso: string;
  nombre: string;
  simbolo: string;
  decimales: number;
  estatus: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCurrencyResponseError {
  codigo_iso?: string[];
  nombre?: string[];
  simbolo?: string[];
  decimales?: string[];
}