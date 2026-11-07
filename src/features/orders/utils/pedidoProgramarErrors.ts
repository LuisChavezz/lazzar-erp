import { AxiosError } from "axios";
import type { QueryClient } from "@tanstack/react-query";
import {
  extractProcessCompatibilityMessage,
  extractQuoteValidationIssues,
  type QuoteValidationIssue,
} from "@/src/features/quotes/utils/quoteValidationErrors";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { ORDERS_QUERY_KEY } from "../constants/ordersQueryKeys";
import {
  firstNonBlankDrfMessage,
  firstNonBlankRejectionMessage,
} from "@/src/utils/firstDrfMessage";

/**
 * `GET` y `PATCH /ventas/pedidos/{id}/programar/` exigen el rol de mesa de
 * control (`_require_mesa_control`): sin él responden **400** con
 * `{ "permiso": "..." }`, no 403. Se muestra este texto en lugar del del
 * backend o el genérico de Axios ("Request failed with status code 400").
 */
export const PEDIDO_PROGRAMAR_PERMISO_MESSAGE =
  "No tienes permiso para programar pedidos. Esta acción es exclusiva de Mesa de Control.";

/** ¿El error es el 400 de permiso de mesa de control? */
export const isMesaControlPermisoError = (error: unknown): boolean => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) return false;
  const data = error.response.data;
  return typeof data === "object" && data !== null && "permiso" in data;
};

/**
 * Claves del 400 de "pedido no programable" de `GET` y `PATCH .../programar/`
 * (EC-750, `_exigir_programable`), en el orden en que las valida el backend.
 * Cada una trae una lista con un mensaje.
 *
 * - `fecha_confirmacion`: el pedido no está confirmado. Es la que se alcanza:
 *   una fila desactualizada cuya confirmación se vació después de cargarla.
 * - `estatus`: el pedido está CANCELADO. Se maneja solo por defensa: `cancelar/`
 *   deja `activo=false` y `programar/` excluye los pedidos inactivos, así que un
 *   pedido cancelado responde **404**, no este 400.
 */
export const PEDIDO_NO_PROGRAMABLE_KEYS = ["estatus", "fecha_confirmacion"] as const;

/**
 * Mensaje del backend si el error es el 400 de pedido no programable
 * (`PEDIDO_NO_PROGRAMABLE_KEYS`); `undefined` en cualquier otro caso, incluido
 * el 404 de un pedido cancelado.
 */
export const extractPedidoNoProgramableMessage = (error: unknown): string | undefined => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) return undefined;
  return firstNonBlankRejectionMessage(error.response.data, PEDIDO_NO_PROGRAMABLE_KEYS);
};

/**
 * Claves de RECHAZO del PATCH: motivos que no corresponden a ningún campo del
 * formulario y por eso van al toast. Mismo criterio que
 * `useUpdatePedidoMesaControl`:
 *
 * - `detail`: `APIException` genéricos de DRF.
 * - `PEDIDO_NO_PROGRAMABLE_KEYS`: pedido sin confirmar (o, por defensa,
 *   cancelado; ver la constante).
 *
 * El 400 de `permiso` (`_require_mesa_control`, no un 403) no pasa por aquí:
 * se traduce antes con `isMesaControlPermisoError`. Además
 * `compatibilidad_proceso` (matriz prenda/proceso): una lista que se muestra
 * completa.
 */
const PROGRAMAR_REJECTION_KEYS = ["detail", ...PEDIDO_NO_PROGRAMABLE_KEYS] as const;

type ProgramarRejectionKey = (typeof PROGRAMAR_REJECTION_KEYS)[number];

/**
 * Primer rechazo con mensaje NO en blanco y la clave de la que salió, en una
 * sola pasada: el toast y la decisión de refrescar la lista leen el mismo
 * resultado. Una clave en blanco se salta, como en `firstNonBlankRejectionMessage`.
 */
const findProgramarRejection = (
  data: unknown,
): { key: ProgramarRejectionKey; message: string } | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const body = data as Record<string, unknown>;
  for (const key of PROGRAMAR_REJECTION_KEYS) {
    const message = firstNonBlankDrfMessage(body[key]);
    if (message) return { key, message };
  }
  return undefined;
};

/**
 * Errores de campo del 400. Reusa `extractQuoteValidationIssues` (el mismo
 * normalizador que la edición de Mesa de Control): DRF anida los errores por
 * ruta y aquí las rutas ya coinciden con las del formulario —
 * `programaciones` (suma excedida) y `programaciones.N.destino` /
 * `programaciones.N.cantidad` / `programaciones.N.comentarios` (por renglón)—.
 * Acepta el mensaje como lista o como string suelto.
 */
const extractProgramacionIssues = (data: unknown): QuoteValidationIssue[] =>
  extractQuoteValidationIssues(data).filter(
    (issue) => issue.path === "programaciones" || issue.path.startsWith("programaciones."),
  );

export const PEDIDO_PROGRAMAR_NOT_FOUND_MESSAGE = "El pedido no existe o no pertenece a tu empresa.";

export interface ProgramarPedidoErrorResult {
  /** Errores de campo para el formulario (`onValidationError`). */
  issues: QuoteValidationIssue[];
  /** Texto del toast. */
  message: string;
  /**
   * La fila de la lista que ofreció "Programar" estaba desactualizada: hay que
   * releer los listados de pedidos para que deje de ofrecerlo.
   */
  refreshOrders: boolean;
}

/**
 * Todo lo que `useProgramarPedido` hace con un error del PATCH, salvo los
 * efectos: los errores de campo, el texto del toast y si hay que releer los
 * listados. El rechazo se lee UNA vez: el toast y `refreshOrders` salen de la
 * misma clave.
 */
export const parseProgramarPedidoError = (error: unknown): ProgramarPedidoErrorResult => {
  let message: string | undefined;
  let issues: QuoteValidationIssue[] = [];
  let refreshOrders = false;
  if (error instanceof AxiosError) {
    const statusCode = error.response?.status;
    const data = error.response?.data;
    if (statusCode === 400 && data) {
      issues = extractProgramacionIssues(data);
      if (isMesaControlPermisoError(error)) {
        message = PEDIDO_PROGRAMAR_PERMISO_MESSAGE;
      } else {
        const rejection = findProgramarRejection(data);
        message = extractProcessCompatibilityMessage(data) ?? rejection?.message;
        refreshOrders =
          rejection !== undefined &&
          (PEDIDO_NO_PROGRAMABLE_KEYS as readonly string[]).includes(rejection.key);
      }
    }
    // `get_object` acota por empresa y excluye los pedidos inactivos: responde
    // 404 a un pedido ajeno y también a uno CANCELADO (`cancelar/` deja
    // `activo=false`). En el segundo caso la fila de la lista estaba
    // desactualizada, así que se releen los listados.
    if (statusCode === 404) {
      message = PEDIDO_PROGRAMAR_NOT_FOUND_MESSAGE;
      refreshOrders = true;
    }
  }
  /* Con errores de campo y sin rechazo, el detalle ya está marcado en el
   * formulario: el toast solo lo anuncia. Sin este caso caería a
   * `extractErrorMessage`, que devolvería "Request failed with status code
   * 400". */
  return {
    issues,
    refreshOrders,
    message:
      message ??
      (issues.length > 0
        ? "Revisa la programación: hay errores marcados."
        : extractErrorMessage(error, "No se pudo guardar la programación")),
  };
};

/**
 * ¿El error de `GET .../programar/` dice que la fila de la lista que ofreció
 * "Programar" estaba desactualizada? Un 404 (pedido CANCELADO: `cancelar/`
 * deja `activo=false` y el endpoint lo excluye) o el 400 de pedido no
 * programable (sin confirmar; `estatus` solo por defensa).
 */
export const isStaleProgramarRowError = (error: unknown): boolean =>
  isNotFoundError(error) || extractPedidoNoProgramableMessage(error) !== undefined;

/**
 * Envuelve la lectura del contexto de "Programar pedido": si falla porque la
 * fila estaba desactualizada, relee los listados de pedidos y vuelve a lanzar
 * el error. Va en el `queryFn` y no en un efecto: corre UNA vez por lectura
 * fallida (StrictMode no repite un `queryFn`, y los 4xx no se reintentan) y lo
 * hereda cualquier consumidor de la consulta. Sin bucle: la llave del contexto
 * no cuelga de `["orders"]`.
 */
export const withStaleProgramarRowRefresh =
  <T>(queryClient: Pick<QueryClient, "invalidateQueries">, load: () => Promise<T>) =>
  async (): Promise<T> => {
    try {
      return await load();
    } catch (error) {
      if (isStaleProgramarRowError(error)) {
        void queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      }
      throw error;
    }
  };
