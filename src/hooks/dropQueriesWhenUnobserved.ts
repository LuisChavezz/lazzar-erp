import type { Query, QueryClient } from "@tanstack/react-query";

/**
 * Saca de la caché las consultas de un registro que dejó de existir (p. ej. un
 * pedido cancelado, cuyo detalle responde 404). Las que nadie observa se
 * quitan ya; las que tienen observadores (la página del detalle abierta) se
 * quitan cuando se va el ÚLTIMO.
 *
 * No se quitan de inmediato porque un observador montado sobre una llave
 * quitada crea otra consulta vacía en su siguiente render y la pide: justo el
 * 404 que se quiere evitar. Tampoco se invalidan, por lo mismo. Mientras
 * siguen montadas conservan el último dato y no se piden.
 *
 * La suscripción a la caché se suelta cuando ya no queda ninguna por quitar,
 * también si otra cosa las quitó antes (`queryClient.clear()` al cerrar
 * sesión): así no queda escuchando, ni retiene las consultas, toda la sesión.
 */
export const dropQueriesWhenUnobserved = (queryClient: QueryClient, queries: Query[]) => {
  const queryCache = queryClient.getQueryCache();
  const watched = new Set<Query>();
  for (const query of queries) {
    if (query.getObserversCount() === 0) queryCache.remove(query);
    else watched.add(query);
  }
  if (watched.size === 0) return;

  const unsubscribe = queryCache.subscribe((event) => {
    if (!watched.has(event.query)) return;
    if (event.type === "removed") {
      watched.delete(event.query);
    } else if (event.type === "observerRemoved" && event.query.getObserversCount() === 0) {
      watched.delete(event.query);
      queryCache.remove(event.query);
    }
    if (watched.size === 0) unsubscribe();
  });
};
