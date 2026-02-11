export interface SatCatalogsResponse {
  regimenes_fiscales: RegimenesFiscale[];
}

export interface RegimenesFiscale {
  id_sat_regimen_fiscal?: number;
  codigo:                 string;
  descripcion:            string;
  aplica_fisica:          boolean;
  aplica_moral:           boolean;
  id_sat_uso_cfdi?:       number;
}
