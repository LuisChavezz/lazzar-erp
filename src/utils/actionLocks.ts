/**
 * Núcleo PURO de los candados contra el doble envío, sin React: lo usan
 * `useRowActionLock` (un candado por fila) y los formularios con
 * `submitLockRef` (un candado por envío), y se prueba en `tests/unit`.
 */

/**
 * Toma el candado de `id` sobre el conjunto de ids en vuelo. `false` si ya
 * estaba tomado: el segundo intento no debe disparar nada.
 */
export const acquireRowLock = (held: Set<number>, id: number): boolean => {
  if (held.has(id)) return false;
  held.add(id);
  return true;
};

/** Suelta el candado de `id` (sin efecto si no estaba tomado). */
export const releaseRowLock = (held: Set<number>, id: number): void => {
  held.delete(id);
};

/** ¿El candado de `id` está tomado? `null` (sin registro) nunca lo está. */
export const isRowLockHeld = (held: ReadonlySet<number>, id: number | null): boolean =>
  id !== null && held.has(id);

/**
 * Corre `submit` bajo el candado de un envío: lo toma de forma SÍNCRONA antes
 * de llamar a `submit` (es decir, antes de la validación asíncrona de TanStack
 * Form) y lo suelta cuando la promesa termina, con cualquier resultado —también
 * si la validación falla y no hubo petición—, para que el formulario pueda
 * volver a enviarse.
 *
 * Devuelve la promesa del envío, o `null` si el candado ya estaba tomado (el
 * segundo clic o Enter no hace nada). La promesa no rechaza: un error de
 * `submit` ya lo manejó el formulario y no debe escapar como rechazo no
 * manejado.
 */
export const runWithSubmitLock = (
  lock: { current: boolean },
  submit: () => Promise<unknown>,
): Promise<void> | null => {
  if (lock.current) return null;
  lock.current = true;
  return submit()
    .then(
      () => undefined,
      () => undefined,
    )
    .finally(() => {
      lock.current = false;
    });
};
