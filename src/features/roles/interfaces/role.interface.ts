export interface Role {
  id: number;
  permisos_count: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  clave_departamento: string;
  is_system: boolean;
  estatus: string;
  created_at: string;
  updated_at: string;
  empresa: number;
  permisos: [];
}