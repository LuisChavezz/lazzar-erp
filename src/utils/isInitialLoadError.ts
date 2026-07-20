/**
 * ¿La consulta falló SIN haber cargado datos nunca? (`isError && !hasLoaded`).
 *
 * Distingue un error "de pantalla completa" (la carga inicial falló y no hay
 * nada que mostrar) de un refetch fallido con datos en caché —que debe
 * conservar la tabla ya cargada y avisar por toast (ver `useHasLoadedQuery`)—.
 * Definición única compartida por las vistas que pasan `isError` a `DataTable`.
 */
export const isInitialLoadError = (isError: boolean, hasLoaded: boolean): boolean =>
  isError && !hasLoaded;
