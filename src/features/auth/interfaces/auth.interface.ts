export interface LoginResponse {
    token:            string;
    user_id:          number;
    email:            string;
    username:         string;
    nombre_completo:  string;
    es_admin:         boolean;
    is_superuser:     boolean;
    is_admin_empresa: boolean;
    empresa_id:       number;
    permisos:         Permission[];
}

type Permission =
  | "R-CONF"
  | "E-CONF"
  | "D-CONF"