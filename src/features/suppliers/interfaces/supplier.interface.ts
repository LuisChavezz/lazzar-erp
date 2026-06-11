import { Company } from "../../companies/interfaces/company.interface";
import {
  RegimenFiscal,
  FormaPago,
  MetodoPago,
} from "../../sat/interfaces/sat-info.interface";
import { Currency } from "../../currency/interfaces/currency.interface";

export interface Supplier {
  id: number;
  empresa: Company["id"];
  codigo: string;
  nombre: string;
  razon_social: string;
  rfc: string;
  email: string;
  telefono: string;
  contacto_principal: string;
  dias_credito: number;
  limite_credito: string;
  sat_regimen_fiscal: RegimenFiscal["id_sat_regimen_fiscal"];
  sat_forma_pago: FormaPago["id_sat_forma_pago"];
  sat_metodo_pago: MetodoPago["id_sat_metodo_pago"];
  moneda: Currency["id"];
  fax: string;
}

export interface SupplierCreate {
  empresa: Company["id"];
  codigo: string;
  nombre: string;
  razon_social: string;
  rfc: string;
  email: string;
  telefono: string;
  contacto_principal: string;
  dias_credito: number;
  limite_credito: string;
  sat_regimen_fiscal: RegimenFiscal["id_sat_regimen_fiscal"];
  sat_forma_pago: FormaPago["id_sat_forma_pago"];
  sat_metodo_pago: MetodoPago["id_sat_metodo_pago"];
  moneda: Currency["id"];
  fax: string;
}

