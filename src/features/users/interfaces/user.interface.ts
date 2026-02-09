export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  estatus: string;
  empresa: number;
  sucursal_default: number;
  sucursales: number[];
  departamentos: number[];
  telefono: string;
  avatar_url: string | null;
  is_admin_empresa: boolean;
  date_joined: string;
  last_login: string | null;
}