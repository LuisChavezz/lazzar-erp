import type { PreOrderHistoryEvent } from "../interfaces/pre-order.interface";

/**
 * Quién hizo un evento del historial de la pre-orden. El backend manda
 * `usuario` como `{id, nombre}` (`PreOrdenEventoSerializer`); antes se leía como
 * texto y el nombre nunca se mostraba. `usuario_nombre` y un `usuario` texto se
 * respetan por si llegan de otra versión. `null` si el evento no tiene usuario.
 */
export const preOrderEventUserName = (event: Pick<PreOrderHistoryEvent, "usuario" | "usuario_nombre">): string | null => {
  const fromField = event.usuario_nombre?.trim();
  if (fromField) return fromField;
  const { usuario } = event;
  if (typeof usuario === "string") return usuario.trim() || null;
  if (usuario && typeof usuario === "object") return usuario.nombre?.trim() || null;
  return null;
};

/** Eventos que cierran algo (la pre-orden o su OP): se pintan con el ícono de cancelación. */
const CANCELLATION_EVENTS: ReadonlySet<string> = new Set(["cancelada", "op_cancelada"]);

export const isPreOrderCancellationEvent = (evento: string): boolean => CANCELLATION_EVENTS.has(evento);
