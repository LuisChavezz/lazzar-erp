import { drfActionErrorMessage, handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import type { OpportunityFormValues } from "../schemas/opportunity.schema";

/**
 * Textos de error de oportunidades. La lógica de DRF (errores por campo del
 * serializer, `detail` de las acciones) vive en `src/utils/drfWriteErrors.ts`;
 * aquí quedan los campos del formulario y los mensajes propios del módulo.
 *
 * Los nombres de campo del formulario son los del backend, así que cada error
 * cae bajo su campo sin traducir llaves. Dos casos de negocio llegan así:
 * `{"motivo_perdida": "Indica por qué se perdió."}` y, al pasar a `Perdida` una
 * oportunidad con cotización autorizada, `{"etapa": "Una oportunidad ganada no
 * se puede perder."}`.
 */

type OpportunityFormField = keyof OpportunityFormValues;

const FORM_FIELDS: readonly OpportunityFormField[] = [
  "cliente",
  "nombre_contacto",
  "telefono",
  "correo",
  "titulo",
  "monto_estimado",
  "etapa",
  "motivo_perdida",
  "proximo_contacto",
  "notas",
];

export type SetOpportunityFieldError = (field: OpportunityFormField, message: string) => void;

/** Error de alta/edición: ver `handleDrfWriteError`. */
export const handleOpportunityWriteError = (
  error: unknown,
  fallback: string,
  setFieldError?: SetOpportunityFieldError
): string => handleDrfWriteError(error, fallback, FORM_FIELDS, setFieldError);

/** Otra persona ya la dio de baja (404). */
export const OPPORTUNITY_GONE_MESSAGE = "La oportunidad ya no existe. Se actualizó el listado.";

/**
 * La misma situación vista desde el DETALLE de la oportunidad, donde no hay
 * listado que actualizar: el 404 también llega si dejó de ser visible.
 */
export const OPPORTUNITY_GONE_DETAIL_MESSAGE = "La oportunidad ya no existe o no tienes acceso a ella.";

/** Error de la baja: un 404 significa que ya no existe. */
export const opportunityActionErrorMessage = (error: unknown, fallback: string): string =>
  drfActionErrorMessage(error, fallback, OPPORTUNITY_GONE_MESSAGE);
