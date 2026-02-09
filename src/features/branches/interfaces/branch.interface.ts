export interface Branch {
  id: number;
  id_sucursal: number;
  nombre: string;
  codigo: string;
  telefono: string | null;
  email: string | null;
  direccion_linea1: string | null;
  direccion_linea2: string | null;
  ciudad: string | null;
  estado: string | null;
  cp: string | null;
  pais: string | null;
  lat: number | null;
  lng: number | null;
  estatus: string;
  created_at: string;
  updated_at: string;
  empresa: number;
}
