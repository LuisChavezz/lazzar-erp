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
  /** `null` si el usuario no tiene empresa asignada. */
  empresa: Company["id"] | null;
  sucursal_default: Branch["id"];
  sucursales: Branch["id"][];
  departamentos: number[];
  telefono: string;
  avatar_url: string | null;
  is_admin_empresa: boolean;
  /**
   * Superusuario de la plataforma. Desde EC-798, ventas, finanzas, terceros y
   * compras lo acotan a su propia `empresa`, como a cualquier usuario, y desde
   * EC-843 también `/usuarios/`; otros módulos del backend (catálogo,
   * inventarios, WMS, RH, producción) todavía le muestran todas las empresas.
   */
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  roles_ids: Role["id"][];
  /** `get_full_name()` del backend (solo lectura). */
  nombre_completo?: string;
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
/** Fila de `GET /usuarios/catalogo/`: usuario activo de la empresa activa. */
export interface UserCatalogItem {
  id: number;
  /** Nombre y apellido; el email si el usuario no tiene nombre. */
  nombre_completo: string;
}
