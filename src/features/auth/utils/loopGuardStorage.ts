/**
 * Piezas compartidas de las guardas contra ciclos de recarga que viven en
 * `sessionStorage` (sobreviven a las recargas de ESTA pestaña y mueren con
 * ella): la de "sin sesión" de `sessionRecovery` y la del cierre de sesión de
 * `signOutLoopGuard` (EC-851). Cada guarda decide qué anota y cuándo corta;
 * aquí solo vive la ventana de tiempo y el acceso seguro al almacenamiento.
 *
 * El acceso distingue "no hay marca" (`null`) de "no hay almacenamiento"
 * (`undefined`): `sessionStorage` lanza si los datos del sitio están
 * bloqueados, y cada guarda resuelve ese caso a su manera.
 */

/** Ventana (ms) en la que dos marcas cuentan como el mismo ciclo. */
export const LOOP_GUARD_WINDOW_MS = 60_000;

/** ¿`at` es una marca de tiempo de hace menos de `LOOP_GUARD_WINDOW_MS`? */
export const isRecentLoopMark = (at: unknown, now: number): at is number =>
  typeof at === "number" && now - at < LOOP_GUARD_WINDOW_MS;

/** La marca guardada en `key`, `null` si no hay, o `undefined` sin `sessionStorage`. */
export const readLoopMark = (key: string): string | null | undefined => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return undefined;
  }
};

/** Guarda la marca. `false` si `sessionStorage` no está disponible. */
export const writeLoopMark = (key: string, value: string): boolean => {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

/** Borra la marca. Nunca lanza. */
export const clearLoopMark = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Sin sessionStorage no hay marca que borrar.
  }
};
