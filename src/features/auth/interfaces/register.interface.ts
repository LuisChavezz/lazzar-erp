export interface RegisterFormValues {
  empresa_razon_social: string;
  empresa_codigo: string;
  empresa_rfc: string;
  empresa_email: string;

  sucursal_nombre: string;
  sucursal_codigo: string;
  
  usuario_username: string;
  usuario_email: string;
  usuario_password: string;
  usuario_first_name: string;
  usuario_last_name: string;
}

export interface OnSuccessRegisterResponse {
  message: string;
  empresa: {
    id: number;
    codigo: string;
    razon_social: string;
  };
  usuario: {
    id: number;
    username: string;
    email: string;
  };
}
