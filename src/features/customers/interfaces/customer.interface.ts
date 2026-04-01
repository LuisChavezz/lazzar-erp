import { Company } from "../../companies/interfaces/company.interface";
import { RegimenFiscal, UsoCfdi } from "../../sat/interfaces/sat-info.interface";


export interface Customer {
  id: string;
  empresa: Company["id"];
  razon_social: string;
  nombre: string;
  telefono: string;
  correo: string;
  rfc: string;
  direccion_fiscal: string;
  colonia: string;
  codigo_postal: string;
  ciudad: string;
  estado: string;
  giro_empresarial: string;
  activo: boolean;
  sat_regimen_fiscal: RegimenFiscal["id_sat_regimen_fiscal"];
  sat_uso_cfdi: UsoCfdi["id_sat_uso_cfdi"];
}

export interface CustomerCreate {
  empresa: Company["id"];
  razon_social: string;
  nombre: string;
  telefono: string;
  correo: string;
  rfc: string;
  direccion_fiscal: string;
  colonia: string;
  codigo_postal: string;
  ciudad: string;
  estado: string;
  giro_empresarial: string;
  sat_regimen_fiscal: RegimenFiscal["id_sat_regimen_fiscal"];
  sat_uso_cfdi: UsoCfdi["id_sat_uso_cfdi"];
}

export interface VerifyRfcResponse {
  Rfc: string;
  FormatoCorrecto: boolean;
  Activo: boolean;
  Localizado: boolean;
}