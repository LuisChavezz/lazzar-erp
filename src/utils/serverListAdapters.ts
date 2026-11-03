import { isNotFoundError } from "@/src/utils/drfWriteErrors";

/**
 * Adaptadores entre una tabla en modo servidor (`useServerTable`) y la
 * convención de paginación de su endpoint. La tabla y la URL siempre hablan de
 * `page` (1-indexada) y `pageSize`; el adaptador lo traduce a lo que el
 * endpoint espera y saca de su respuesta las filas y el total.
 */

/** Página pedida, como la entienden la tabla y la URL. */
export interface ServerListPage {
  /** 1-indexada. */
  page: number;
  pageSize: number;
}

export interface ServerListAdapter<TResponse, TRow> {
  /**
   * Parámetros de paginación para el endpoint. Forman parte de la llave de la
   * consulta: un adaptador que devuelva `{}` (un endpoint que entrega el
   * arreglo completo) no vuelve a consultar al cambiar de página.
   */
  paginationParams(page: ServerListPage): Record<string, number>;
  /**
   * Filas de la página y total de la consulta. Recibe la página pedida para
   * que un adaptador sobre un arreglo completo pueda recortarlo aquí.
   */
  parse(
    response: TResponse,
    page: ServerListPage,
  ): {
    rows: TRow[];
    total: number;
    /**
     * `false` si el endpoint dice que ya no hay más páginas (DRF: `next:
     * null`). Opcional: sin él solo cuentan `total` y una página vacía.
     */
    hasMore?: boolean;
  };
  /**
   * ¿Este error significa "esa página ya no existe"? Si se omite, ningún error
   * se trata así. Una página vacía con total mayor que cero se corrige aparte,
   * sin pasar por aquí.
   */
  isOutOfRange?(error: unknown): boolean;
}

/** Sobre de DRF para listas paginadas. Las claves extra del endpoint se conservan. */
export interface PaginatedListResponse<TRow> {
  count: number;
  next: string | null;
  previous: string | null;
  results: TRow[];
}

const parsePaginated = <TRow>(response: PaginatedListResponse<TRow>) => ({
  rows: response.results,
  total: response.count,
  hasMore: response.next !== null,
});

/**
 * `?limit=&offset=` → `{ count, next, previous, results }`.
 *
 * El comportamiento ante un `offset` fuera de rango depende del endpoint: lo
 * habitual es responder vacío con su `count` (lo corrige `useServerTable`),
 * pero un 404 también se trata como "esa página ya no existe".
 */
export const limitOffsetAdapter = <
  TRow,
  TResponse extends PaginatedListResponse<TRow> = PaginatedListResponse<TRow>,
>(): ServerListAdapter<TResponse, TRow> => ({
  paginationParams: ({ page, pageSize }) => ({ limit: pageSize, offset: (page - 1) * pageSize }),
  parse: parsePaginated,
  isOutOfRange: isNotFoundError,
});

/**
 * `?page=&page_size=` → `{ count, next, previous, results }`. DRF responde 404
 * a una página fuera de rango.
 */
export const pageNumberAdapter = <
  TRow,
  TResponse extends PaginatedListResponse<TRow> = PaginatedListResponse<TRow>,
>(): ServerListAdapter<TResponse, TRow> => ({
  paginationParams: ({ page, pageSize }) => ({ page, page_size: pageSize }),
  parse: parsePaginated,
  isOutOfRange: isNotFoundError,
});

/** Tamaño de página al recorrer una lista completa: el `max_limit` de los endpoints. */
export const SERVER_LIST_EXPORT_PAGE_SIZE = 500;

/**
 * Tope de páginas al recorrer una lista: una respuesta que nunca se acaba (un
 * `count` que crece sin parar, un adaptador mal armado) no debe colgar la
 * exportación. Con 500 filas por página son 100 000 registros.
 */
const SERVER_LIST_EXPORT_MAX_PAGES = 200;

/** Páginas que se piden a la vez tras la primera. */
const SERVER_LIST_EXPORT_CONCURRENCY = 3;

/**
 * TODAS las filas que cumplen `criteria` (filtros, búsqueda y orden con su
 * desempate, como los arma `useServerTable`). Es lo que usa una exportación:
 * la tabla en modo servidor solo conoce la página que muestra.
 *
 * - La primera página dice el total y el tamaño de página EFECTIVO: un backend
 *   puede recortar `limit` por debajo de lo pedido (`max_limit` de DRF), así
 *   que el resto de las páginas se calcula con las filas que de verdad llegaron
 *   y no con `pageSize`. Así no se pierden ni se saltan filas.
 * - Las páginas restantes se piden en lotes de `SERVER_LIST_EXPORT_CONCURRENCY`
 *   y se juntan en su orden.
 * - Se detiene al juntar `total` filas, cuando el endpoint dice que no hay más
 *   (`hasMore: false`) o al recibir una página vacía; lo que llegue de páginas
 *   posteriores a ese punto se descarta.
 *
 * Si el conjunto cambia mientras se recorre, el resultado refleja cada página
 * en el momento en que se pidió, igual que paginar a mano.
 */
export const fetchAllServerListRows = async <TResponse, TRow>({
  queryFn,
  adapter,
  criteria,
  pageSize = SERVER_LIST_EXPORT_PAGE_SIZE,
}: {
  queryFn: (params: Record<string, string | number>) => Promise<TResponse>;
  adapter: ServerListAdapter<TResponse, TRow>;
  criteria: Readonly<Record<string, string>>;
  pageSize?: number;
}): Promise<TRow[]> => {
  const fetchPage = async (listPage: ServerListPage) =>
    adapter.parse(
      await queryFn({ ...criteria, ...adapter.paginationParams(listPage) }),
      listPage,
    );

  const first = await fetchPage({ page: 1, pageSize });
  const rows = [...first.rows];
  if (rows.length === 0 || rows.length >= first.total || first.hasMore === false) return rows;

  // Tamaño efectivo: lo que el backend entregó en la primera página.
  const effectiveSize = rows.length;
  const pageCount = Math.ceil(first.total / effectiveSize);
  if (pageCount > SERVER_LIST_EXPORT_MAX_PAGES) {
    throw new Error("La lista es demasiado grande para exportarla completa.");
  }

  for (let start = 2; start <= pageCount; start += SERVER_LIST_EXPORT_CONCURRENCY) {
    const pages = Array.from(
      { length: Math.min(SERVER_LIST_EXPORT_CONCURRENCY, pageCount - start + 1) },
      (_, i) => fetchPage({ page: start + i, pageSize: effectiveSize }),
    );
    // `Promise.all` conserva el orden de las páginas, no el de llegada.
    for (const parsed of await Promise.all(pages)) {
      rows.push(...parsed.rows);
      if (parsed.rows.length === 0 || rows.length >= first.total || parsed.hasMore === false) {
        return rows;
      }
    }
  }
  return rows;
};
