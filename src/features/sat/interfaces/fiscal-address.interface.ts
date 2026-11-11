/**
 * Domicilio fiscal de la empresa activa, tal como lo devuelve
 * `GET /nucleo/empresa-actual/domicilio-fiscal/` (EC-860). El backend manda
 * siempre los nueve campos como texto: una empresa que aún no lo captura
 * responde `""` en todos y `pais: "MEX"`.
 */
export interface FiscalAddress {
  calle: string;
  numero_exterior: string;
  numero_interior: string;
  colonia: string;
  localidad: string;
  municipio: string;
  estado: string;
  /** Clave de 3 letras (`MEX`); el backend la guarda en mayúsculas. */
  pais: string;
  codigo_postal: string;
}

export type FiscalAddressField = keyof FiscalAddress;

/** Los nueve campos, en el orden del formulario; los que pinta bajo su input. */
export const FISCAL_ADDRESS_FIELDS = [
  "calle",
  "numero_exterior",
  "numero_interior",
  "colonia",
  "codigo_postal",
  "localidad",
  "municipio",
  "estado",
  "pais",
] as const satisfies readonly FiscalAddressField[];

/** País por omisión del backend (`Empresa.fiscal_pais`). */
export const DEFAULT_FISCAL_COUNTRY = "MEX";
