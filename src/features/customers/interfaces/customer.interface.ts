export interface CustomerOrderProfile {
  clienteNombre: string;
  razonSocial: string;
  rfc: string;
  regimenFiscal: "601" | "603" | "605";
  direccionFiscal: string;
  coloniaFiscal: string;
  codigoPostalFiscal: string;
  ciudadFiscal: string;
  estadoFiscal: string;
  giroEmpresa: string;
  destinatario: string;
  empresaEnvio: string;
  telefonoEnvio: string;
  celularEnvio: string;
  direccionEnvio: string;
  coloniaEnvio: string;
  codigoPostalEnvio: string;
  ciudadEnvio: string;
  estadoEnvio: string;
  referenciasEnvio?: string;
}

export interface CustomerItem {
  id: string;
  razonSocial: string;
  contacto: string;
  telefono: string;
  correo: string;
  ultimaCompra: string;
  ultimoPedido: string;
  vendedor: string;
  orderProfile: CustomerOrderProfile;
}

export interface Customer {
  id: string;
  nombre: string;
  razonSocial: string;
  telefono: string;
  correo: string;
  ultimaCompra: string;
  ultimoPedido: string;
  vendedor: string;
  orderProfile: CustomerOrderProfile;
}
