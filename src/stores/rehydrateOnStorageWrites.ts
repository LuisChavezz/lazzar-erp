/**
 * Mantiene un store persistido de zustand al día con lo que OTRA pestaña
 * escribe en su clave de `localStorage` (EC-847).
 *
 * `persist` escribe el estado completo de la pestaña en cada `set`, y cada
 * pestaña tiene el suyo en memoria. Sin esto, una pestaña con datos viejos
 * deshace lo que otra acaba de escribir: la limpieza del workspace al cambiar
 * de empresa, o la Dirección fiscal guardada para otra empresa. El evento
 * `storage` solo llega a las DEMÁS pestañas del mismo origen, así que la
 * pestaña que escribió no se relee a sí misma.
 *
 * `rehydrate()` lee la clave y la mezcla con el estado en memoria sin volver a
 * escribirla (usa el `set` interno de `persist`), así que dos pestañas no se
 * responden en ciclo. Los campos que el store no persiste (`partialize`) no se
 * tocan.
 */

interface StorageWriteLike {
  key: string | null;
  storageArea: unknown;
}

/** ¿El evento es una escritura de otra pestaña en `key` de `localStorage`? */
export const isOtherTabWrite = (event: StorageWriteLike, key: string, area: unknown): boolean =>
  event.key === key && event.storageArea === area;

/** Registra la relectura. Sin `window` (servidor, pruebas) no hace nada. */
export const rehydrateOnStorageWrites = (
  persistApi: { rehydrate: () => unknown },
  key: string
): void => {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
  window.addEventListener("storage", (event) => {
    if (isOtherTabWrite(event, key, window.localStorage)) void persistApi.rehydrate();
  });
};
