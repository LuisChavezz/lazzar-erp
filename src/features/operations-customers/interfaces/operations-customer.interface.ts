/**
 * Recurso independiente de /terceros/clientes-mesa-control/ — no comparte
 * tipo con Customer (clientes) ni con AccountingCustomer: a diferencia de
 * ambos, este endpoint incluye clientes inactivos (sin filtro `activo=True`).
 */
export interface OperationsCustomer {
  id: number;
  nombre: string;
  razon_social: string;
  rfc: string;
  telefono: string;
  celular: string | null;
  contacto: string | null;
  ciudad: string;
  estado: string;
  activo: boolean;
}
