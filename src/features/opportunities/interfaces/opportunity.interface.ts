import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import type { EstadoOportunidad, EtapaOportunidad } from "../constants/opportunityChoices";

/**
 * Oportunidad del CRM (`/ventas/oportunidades/`). El backend devuelve la MISMA
 * forma en el listado, el detalle y la respuesta de una escritura.
 *
 * - `etapa` es lo que se captura (`Nueva`, `Contactada`, `Perdida`); `estado`
 *   lo CALCULA el backend: `Perdida` si la etapa lo es, `Ganada` si tiene una
 *   cotización autorizada, `Cotizada` si tiene alguna cotización, y si no, la
 *   etapa. Nunca se envía.
 * - `vendedor` lo fija el backend con el usuario que da de alta; es de solo
 *   lectura. Puede venir `null` en registros creados por otros flujos.
 * - `cliente_razon_social` (EC-902) es la razón social del cliente y
 *   `cliente_nombre` su `nombre`, que es la PERSONA DE CONTACTO del cliente
 *   (EC-810). Los dos llegan `null` sin cliente o si el usuario no puede ver a
 *   ese cliente; la razón social puede llegar en blanco. Se nombran con
 *   `getOpportunityClienteLabel`.
 * - `monto_estimado` es un decimal en texto ("1500.00"), sin moneda.
 * - `titulo` puede venir vacío en registros existentes, aunque al escribir el
 *   backend rechaza un `""` explícito.
 */
export interface Opportunity {
  id: number;
  cliente: number | null;
  cliente_nombre: string | null;
  cliente_razon_social: string | null;
  vendedor: number | null;
  vendedor_nombre: string | null;
  nombre_contacto: string;
  telefono: string;
  correo: string;
  titulo: string;
  monto_estimado: string;
  etapa: EtapaOportunidad;
  estado: EstadoOportunidad;
  motivo_perdida: string;
  proximo_contacto: string | null;
  notas: string;
  created_at: string | null;
  updated_at: string | null;
}

/** Campos que el backend acepta al escribir. */
export interface OpportunityWrite {
  cliente: number | null;
  nombre_contacto: string;
  telefono: string;
  correo: string;
  titulo: string;
  monto_estimado: string;
  etapa: EtapaOportunidad;
  motivo_perdida: string;
  proximo_contacto: string | null;
  notas: string;
}

/** Alta: `titulo` se OMITE cuando va vacío (un `""` explícito da 400). */
export type OpportunityCreate = Omit<OpportunityWrite, "titulo"> & { titulo?: string };

/** Edición (PATCH): solo los campos que cambiaron. */
export type OpportunityPatch = Partial<OpportunityWrite>;

export interface OpportunityUpdateVariables {
  id: number;
  changes: OpportunityPatch;
}

export type OpportunityListResponse = PaginatedListResponse<Opportunity>;
