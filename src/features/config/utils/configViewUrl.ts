/**
 * La vista abierta en `/config` vive en la URL (`?view=products`), para que
 * recargar, atrás/adelante y compartir el enlace la reabran (EC-956).
 */
export const CONFIG_VIEW_PARAM = "view";

/**
 * La vista de la URL, solo si es una de las que el menú ofrece a este usuario
 * (`views`: las de sus tarjetas visibles). Un valor desconocido o una vista sin
 * permiso se tratan como ausentes: se muestra el menú.
 */
export const resolveConfigView = (
  value: string | null,
  views: readonly string[],
): string | null => (value !== null && views.includes(value) ? value : null);

/**
 * La query con `view` puesta (o quitada, con `null`), conservando el resto de
 * parámetros: los de cada tabla (`prod_`, `var_`, `mat_`, los de proveedores)
 * se quedan al volver al menú, y la tarjeta los recupera al reabrirse.
 */
export const configViewQuery = (current: string, view: string | null): string => {
  const query = new URLSearchParams(current);
  if (view === null) query.delete(CONFIG_VIEW_PARAM);
  else query.set(CONFIG_VIEW_PARAM, view);
  return query.toString();
};

/**
 * ¿La entrada actual del historial es una vista que está JUSTO después del
 * menú? Se recalcula cada vez que cambia `?view=` en esta sesión montada:
 * pasar del menú (`null`) a una vista —abrir una tarjeta o "adelante" del
 * navegador— la marca; cualquier otro cambio la quita. Al montar (recarga,
 * enlace directo) arranca en `false`. Vive en memoria y no en
 * `history.state`, porque las tablas escriben su URL con
 * `replaceState(null, …)` y borrarían una marca guardada ahí.
 */
export const nextOpenedFromMenu = (
  previousView: string | null,
  nextView: string | null,
  previousMark: boolean,
): boolean => (previousView === nextView ? previousMark : previousView === null && nextView !== null);
