/**
 * Decide si la pestaña cambió de usuario (EC-848), a partir del usuario que vio
 * primero (`observed`) y del id autenticado actual (`userId`, `undefined`
 * mientras la sesión carga o si no hay sesión).
 *
 * - El primer id que llega fija la referencia: la carga inicial (`loading` → A)
 *   nunca recarga.
 * - Sin id (cargando, una relectura con `update()`, o `unauthenticated`) se
 *   conserva la referencia: perder la sesión ya lo maneja
 *   `SessionRecoveryProvider`, y si después llega OTRO usuario se detecta.
 * - El mismo id (relectura, cambio de empresa) no hace nada.
 * - Otro id pide recargar, y la referencia se queda en el usuario anterior: si
 *   la recarga no ocurre (el usuario la cancela en un aviso `beforeunload`), no
 *   se reintenta en cada render, solo con un nuevo cambio de id.
 */
export const observeSessionUser = (
  observed: string | undefined,
  userId: string | undefined
): { observed: string | undefined; reload: boolean } => {
  if (userId === undefined) return { observed, reload: false };
  if (observed === undefined) return { observed: userId, reload: false };
  return { observed, reload: observed !== userId };
};
