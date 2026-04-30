
export interface CustomerAddress {
  id: number;
  destinatario: string;
  empresa_envio: string;
  telefono_envio: string;
  celular_envio: string;
  direccion_envio: string;
  colonia_envio: string;
  codigo_postal: string;
  ciudad_envio: string;
  estado_envio: string;
  referencias: string;
  is_default: boolean;
  activo: boolean; 
  cliente: number;
  empresa: number;
}

export interface CustomerAddressCreate {
  destinatario: string;
  empresa_envio: string;
  telefono_envio: string;
  celular_envio: string;
  direccion_envio: string;
  colonia_envio: string;
  codigo_postal: string;
  ciudad_envio: string;
  estado_envio: string;
  referencias?: string;
  is_default?: boolean;
  activo?: boolean; 
  cliente: number;
  empresa: number;
}
