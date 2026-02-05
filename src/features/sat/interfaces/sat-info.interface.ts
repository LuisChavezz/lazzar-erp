export interface SatCatalogsResponse {
  regimenes_fiscales: RegimenesFiscale[];
  usos_cfdi:          RegimenesFiscale[];
  metodos_pago:       MetodosPago[];
  formas_pago:        FormasPago[];
}

export interface FormasPago {
  id_sat_forma_pago: number;
  codigo:            string;
  descripcion:       string;
  bancarizado:       boolean;
}

export interface MetodosPago {
  id_sat_metodo_pago: number;
  codigo:             string;
  descripcion:        string;
}

export interface RegimenesFiscale {
  id_sat_regimen_fiscal?: number;
  codigo:                 string;
  descripcion:            string;
  aplica_fisica:          boolean;
  aplica_moral:           boolean;
  id_sat_uso_cfdi?:       number;
}
