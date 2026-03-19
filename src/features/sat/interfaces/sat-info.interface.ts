export interface SatCatalogsResponse {
  regimenes_fiscales: RegimenFiscal[];
  usos_cfdi: UsoCfdi[];
}

export interface RegimenFiscal {
  id_sat_regimen_fiscal: number;
  codigo:                 string;
  descripcion:            string;
  aplica_fisica:          boolean;
  aplica_moral:           boolean;
  id_sat_uso_cfdi?:       number;
}

export interface UsoCfdi {
  id_sat_uso_cfdi: number;
  codigo: string;
  descripcion: string;
  aplica_fisica: boolean;
  aplica_moral: boolean;
}