/**
 * Contrato de la búsqueda global (`GET /search/?q=&limit=`).
 *
 * El endpoint busca en varias entidades a la vez y devuelve los resultados YA
 * agrupados por tipo. Dos propiedades del contrato mandan sobre el diseño del
 * frontend:
 *
 *  - `grupos` es de LONGITUD VARIABLE: solo incluye las entidades que el usuario
 *    tiene permiso de ver, así que puede traer menos de las tres de hoy. El
 *    frontend NO filtra por permiso —el backend ya lo hizo— y nunca asume un
 *    conjunto fijo de grupos: siempre itera lo que llegue.
 *  - Las longitudes mínimas las dicta el servidor (`longitud_minima`,
 *    `longitud_minima_nombre`), no el cliente. Por debajo de la mínima el
 *    endpoint responde 200 con los grupos vacíos, no un error.
 */

/**
 * Una fila de resultado. `tipo` se tipa como `string` a propósito: el backend
 * puede añadir entidades nuevas (el diseño contempla ~16) sin romper la
 * compilación aquí. Los tipos que el frontend sabe ABRIR viven en
 * `constants/globalSearch.ts`; el resto se pinta pero no es accionable.
 */
export interface GlobalSearchResult {
  tipo: string;
  id: number;
  /** Folio o código del registro. `null` para cotización. */
  codigo: string | null;
  titulo: string;
  subtitulo: string | null;
  estatus: string | null;
}

/** Un grupo de resultados de una misma entidad, con su etiqueta ya traducida. */
export interface GlobalSearchGroup {
  tipo: string;
  /** Nombre legible del grupo, listo para pintar como encabezado. */
  etiqueta: string;
  resultados: GlobalSearchResult[];
  /** `true` si el backend recortó el grupo por `limit`. */
  hay_mas: boolean;
}

/** Respuesta completa del `GET /search/`. */
export interface GlobalSearchResponse {
  q: string;
  limit: number;
  /** Mínimo de caracteres para que la búsqueda consulte algo (2). */
  longitud_minima: number;
  /** Mínimo para que además se busque en los campos de NOMBRE (3). Por debajo
   *  solo se consultan los campos de código/folio. */
  longitud_minima_nombre: number;
  grupos: GlobalSearchGroup[];
}

/** Params del `GET /search/`. */
export interface GlobalSearchParams {
  q: string;
  /** Resultados por grupo. Por defecto 5 en el backend, tope 25. */
  limit?: number;
}
