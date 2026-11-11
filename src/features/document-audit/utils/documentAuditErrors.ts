import { isAxiosError } from "axios";
import { ZodError } from "zod";
import { DEFAULT_QUERY_RETRY } from "@/src/constants/queryCache";
import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstRejection } from "@/src/utils/firstDrfMessage";

/**
 * Parámetros que la bitácora valida (nucleo-erp PR #1072): un valor inválido
 * responde 400 con `{parametro: "mensaje"}`. Cada uno con el nombre que ve el
 * usuario, para que el mensaje diga QUÉ filtro rechazó.
 */
const AUDIT_PARAM_LABELS = {
  tipo: "Tipo de documento",
  documento_id: "Documento",
  accion: "Acción",
  usuario: "Usuario",
  sucursal: "Sucursal",
  origen_tipo: "Tipo de origen",
  origen_id: "Origen",
  fecha_desde: "Fecha desde",
  fecha_hasta: "Fecha hasta",
} as const;

const AUDIT_PARAMS = Object.keys(AUDIT_PARAM_LABELS) as (keyof typeof AUDIT_PARAM_LABELS)[];

/**
 * `retry` de las consultas de la bitácora (listado y `linea-tiempo`): un 400
 * por un parámetro inválido y una respuesta con otra forma (`ZodError`) son
 * deterministas, así que no se reintentan. Solo el 400: no se usa
 * `retryUnlessClientError` porque su `isClientError` cubre también 401, 403 y
 * 404, y esos siguen la política global. El resto conserva
 * `DEFAULT_QUERY_RETRY`.
 */
export const retryDocumentAuditQuery = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ZodError) return false;
  if (isAxiosError(error) && error.response?.status === 400) return false;
  return failureCount < DEFAULT_QUERY_RETRY;
};

/**
 * Mensaje de un error de la bitácora (listado o `linea-tiempo`). Un 400 por un
 * parámetro inválido muestra el mensaje del backend con el nombre del filtro
 * ("Usuario: Debe ser un número entero."). Otro 400 (`non_field_errors`,
 * `detail`, una clave desconocida) o un 403 con su motivo (`detail`) muestran
 * ese texto: es la misma lectura de `handleDrfWriteError`, que sin
 * `setFieldError` solo devuelve el mensaje. Lo demás, como `extractErrorMessage`.
 */
export const documentAuditErrorMessage = (error: unknown, fallback: string): string => {
  // Respuesta con otra forma (`documentTimelineResponseSchema`): su texto es
  // técnico, en inglés.
  if (error instanceof ZodError) return fallback;
  if (isAxiosError(error) && error.response?.status === 400) {
    const rejection = firstRejection(error.response.data, AUDIT_PARAMS);
    if (rejection) return `${AUDIT_PARAM_LABELS[rejection.key]}: ${rejection.message}`;
  }
  return handleDrfWriteError(error, "", []) || extractErrorMessage(error, fallback);
};
