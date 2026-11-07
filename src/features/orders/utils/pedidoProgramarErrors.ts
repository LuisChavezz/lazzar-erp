import { AxiosError } from "axios";
import {
  extractProcessCompatibilityMessage,
  extractQuoteValidationIssues,
  type QuoteValidationIssue,
} from "@/src/features/quotes/utils/quoteValidationErrors";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
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
 * (EC-750, `_exigir_programable`), en el orden en que las valida el backend:
 * primero CANCELADO (`estatus`) y luego sin confirmar (`fecha_confirmacion`);
 * si aplican las dos, solo llega `estatus`. Cada una trae una lista con un
 * mensaje. Solo se alcanzan desde una fila desactualizada: `canProgramarPedido`
 * ya oculta "Programar" para esos pedidos.
 */
export const PEDIDO_NO_PROGRAMABLE_KEYS = ["estatus", "fecha_confirmacion"] as const;

/**
 * Mensaje del backend si el error es el 400 de pedido no programable
 * (cancelado o sin confirmar); `undefined` en cualquier otro caso.
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
 * - `PEDIDO_NO_PROGRAMABLE_KEYS`: pedido no programable (EC-750).
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
    // `get_object` acota por empresa: un pedido ajeno responde 404.
    if (statusCode === 404) message = PEDIDO_PROGRAMAR_NOT_FOUND_MESSAGE;
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
