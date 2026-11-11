/**
 * Cursor de la página siguiente a partir del `next` de DRF.
 *
 * `next` llega como URL ABSOLUTA del backend (la arma `build_absolute_uri`, con
 * el host que el backend cree tener), mientras que `v1_api` trabaja con rutas
 * relativas a su `baseURL`. No se pide esa URL tal cual: se extrae solo el
 * `cursor` (opaco) y se vuelve a pedir el mismo endpoint con NUESTROS filtros,
 * así ninguna petición sale hacia un host o con parámetros que no armamos aquí.
 *
 * `null` si no hay página siguiente, si `next` no es una URL o si no trae
 * cursor.
 */
export const extractAuditCursor = (next: string | null | undefined): string | null => {
  if (!next) return null;
  try {
    const cursor = new URL(next, "http://placeholder.invalid").searchParams.get("cursor");
    return cursor && cursor.trim() !== "" ? cursor : null;
  } catch {
    return null;
  }
};
