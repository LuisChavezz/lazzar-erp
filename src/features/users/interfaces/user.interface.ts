import { Branch } from "../../branches/interfaces/branch.interface";
import { Company } from "../../companies/interfaces/company.interface";
import { Role } from "../../roles/interfaces/role.interface";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  estatus: string;
  empresa: Company["id"];
  sucursal_default: Branch["id"];
  sucursales: Branch["id"][];
  departamentos: number[];
  telefono: string;
  avatar_url: string | null;
  is_admin_empresa: boolean;
  date_joined: string;
  last_login: string | null;
  roles_ids: Role["id"][];
}

export interface RegisterUser {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  sucursal_default: Branch["id"];
  sucursales: Branch["id"][];
  empresa: Company["id"];
  roles: Role["id"][];
}
  
export interface RegisterUserResponseErrors {
  username?: string[];
  email?: string[];
  empresa?: string[];
  sucursal_default?: string[];
}