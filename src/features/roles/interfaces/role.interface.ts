import { Company } from "../../companies/interfaces/company.interface";
import { Permission } from "../../permissions/interfaces/permission.interface";

export interface Role {
  id: number;
  permisos_count: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  clave_departamento: string;
  is_system: boolean;
  estatus: string; // Ej. "activo"
  created_at: string;
  updated_at: string;
  empresa: Company["id"];
}

export interface RolePermissions {
  permisos: Permission["id"][];
}