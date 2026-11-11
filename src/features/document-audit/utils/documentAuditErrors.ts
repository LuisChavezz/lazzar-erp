import { isAxiosError } from "axios";
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
 * Mensaje de un error de la bitácora (listado o `linea-tiempo`). Un 400 por un
 * parámetro inválido muestra el mensaje del backend con el nombre del filtro
 * ("Usuario: Debe ser un número entero."); cualquier otro error, lo mismo que
 * `extractErrorMessage`.
 */
export const documentAuditErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error) && error.response?.status === 400) {
    const rejection = firstRejection(error.response.data, AUDIT_PARAMS);
    if (rejection) return `${AUDIT_PARAM_LABELS[rejection.key]}: ${rejection.message}`;
  }
  return extractErrorMessage(error, fallback);
};
