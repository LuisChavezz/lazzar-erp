import { Branch } from "../../branches/interfaces/branch.interface";
import { Company } from "../../companies/interfaces/company.interface";

export interface SerieFolio {
  id_serie_folio: number;
  tipo_documento: string;
  serie: string;
  folio_actual: number;
  folio_inicial: number;
  folio_final: number;
  prefijo: string;
  sufijo: string;
  relleno_ceros: number;
  separador: string;
  incluir_anio: boolean;
  reiniciar_anual: boolean;
  ultimo_anio: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  empresa: Company["id"];
  sucursal: Branch["id"];
}

export interface SerieFolioCreate {
  tipo_documento: string;
  serie: string;
  folio_inicial: number;
  folio_final: number;
  prefijo: string;
  sufijo: string;
  relleno_ceros: number;
  separador: string;
  incluir_anio: boolean;
  reiniciar_anual: boolean;
  sucursal: Branch["id"];
}
