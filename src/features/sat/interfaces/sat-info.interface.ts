export interface SatCatalogsResponse {
  regimenes_fiscales: RegimenFiscal[];
  usos_cfdi: UsoCfdi[];
  formas_pago: FormaPago[];
  metodos_pago: MetodoPago[];
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

export interface FormaPago {
  id_sat_forma_pago: number;
  codigo: string;
  descripcion: string;
}

export interface MetodoPago {
  id_sat_metodo_pago: number;
  codigo: string;
  descripcion: string;
}