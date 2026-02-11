export interface FiscalAddress {
  calle: string;
  numero_exterior: string;
  numero_interior?: string;
  colonia: string;
  localidad?: string;
  municipio: string;
  estado: string;
  pais: string;
  codigo_postal: string;
}
