export interface LoginSuccessResponse {
  method?: string;
  ephemeral_token?: string;
  mfa_enabled: boolean;
  /** Presente cuando mfa_enabled = false: el backend devuelve el usuario completo junto con las cookies */
  user?: MfaLoginUser;
}

export interface RefreshTokenResponse {
  "access": string;
  "access_expiration": string;
}

export interface MfaCreateResponse {
  method: string;
  backup_codes: string[];
  setup_data: {
    qr_link: string;
  };
}

export interface MfaConfirmResponse {
  detail: string;
}

export interface MfaConfirmErrorResponse {
  non_field_errors: string[];
}

export interface MfaLoginPayload {
  ephemeral_token: string;
  code: string;
}

export const isMfaConfirmErrorResponse = (
  response: unknown,
): response is MfaConfirmErrorResponse => {
  if (!isObjectRecord(response)) {
    return false;
  }

  const errors = response["non_field_errors"];

  return Array.isArray(errors) && errors.every((e) => typeof e === "string");
};

export interface LoginErrorResponse {
  non_field_errors: string[];
}

export type LoginResponse = LoginSuccessResponse | LoginErrorResponse;

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const isLoginErrorResponse = (
  response: unknown,
): response is LoginErrorResponse => {
  if (!isObjectRecord(response)) {
    return false;
  }

  const nonFieldErrors = response["non_field_errors"];

  return Array.isArray(nonFieldErrors) && nonFieldErrors.every((error) => typeof error === "string");
};

export const isLoginSuccessResponse = (
  response: unknown,
): response is LoginSuccessResponse => {
  if (!isObjectRecord(response)) {
    return false;
  }

  return typeof response["mfa_enabled"] === "boolean";
};

type Permission =
  `${"R" | "C" | "E" | "D"}-${
    | "COMPRAS"
    | "CONFIGURACION"
    | "CONTABILIDAD"
    | "CORE"
    | "CRM"
    | "OTROS-MODULOS"
    | "PRODUCCION"
    | "RH"
    | "WMS"
    | "MESACONTROL"
  }`;

/** Datos del usuario incluidos en la respuesta de `/auth/login/verify/` */
export interface MfaLoginUser {
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
  is_superuser: boolean;
  is_staff: boolean;
  empresa_id: number;
  nombre_completo: string;
  es_admin: boolean;
  permisos: Permission[];
  roles_ids: number[];
  date_joined: string;
  last_login: string | null;
}

/** Respuesta completa de `/auth/login/verify/` cuando el login con MFA es exitoso */
export interface MfaLoginSuccessResponse {
  access: string;
  refresh: string;
  access_expiration: string;
  refresh_expiration: string;
  user: MfaLoginUser;
}
