import type { SessionCompany } from "../hooks/useSessionCompany";

/**
 * Textos del guardado bloqueado por no tener confirmada la empresa de la sesión
 * (EC-842). La empresa ya no se elige en un selector: es la asignada al usuario
 * en el backend, así que el texto nunca pide "seleccionar una empresa".
 */

/** El usuario no tiene empresa asignada. */
export const SIN_EMPRESA_BLOCK_MESSAGE =
  "Tu usuario no tiene una empresa asignada. Pide a un administrador que te asigne una para continuar.";

/** La empresa aún se está confirmando (sesión cargando o relectura pendiente). */
export const EMPRESA_LOADING_BLOCK_MESSAGE =
  "Aún se está confirmando la empresa de tu usuario. Intenta de nuevo en un momento.";

/** No se pudo confirmar la empresa (relectura fallida en un token sin empresa). */
export const EMPRESA_UNKNOWN_BLOCK_MESSAGE =
  "No se pudo confirmar la empresa de tu usuario. Recarga la página e inténtalo de nuevo.";

/** La sesión no se pudo cargar (recuperación agotada). */
export const SESSION_ERROR_BLOCK_MESSAGE =
  "No se pudo cargar tu sesión. Usa \"Reintentar\" en el menú lateral e inténtalo de nuevo.";

/** Por qué se bloqueó el guardado, según el estado de la empresa de la sesión. */
export const getSessionCompanyBlockMessage = (
  status: Exclude<SessionCompany["status"], "ready">,
): string =>
  status === "none"
    ? SIN_EMPRESA_BLOCK_MESSAGE
    : status === "unknown"
      ? EMPRESA_UNKNOWN_BLOCK_MESSAGE
      : status === "session-error"
        ? SESSION_ERROR_BLOCK_MESSAGE
        : EMPRESA_LOADING_BLOCK_MESSAGE;
