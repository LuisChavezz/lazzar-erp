import { Branch } from "../../branches/interfaces/branch.interface";

export interface Company {
  id: number;
  codigo: string;
  razon_social: string;
  nombre_comercial: string;
  rfc: string;
  email_contacto: string;
  telefono: string;
  sitio_web: string;
  moneda_base: string;
  timezone: string;
  idioma: string;
  estatus: string;
  logo?: string | null;
  logo_url: string;
  sucursales?: Branch[]; 
}
