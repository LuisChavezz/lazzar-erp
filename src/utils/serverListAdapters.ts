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
  parse(response: TResponse, page: ServerListPage): { rows: TRow[]; total: number };
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

/**
 * TODAS las filas que cumplen `criteria` (filtros, búsqueda y orden con su
 * desempate, como los arma `useServerTable`), página por página. Es lo que
 * usa una exportación: la tabla en modo servidor solo conoce la página que
 * muestra.
 *
 * Se detiene al juntar `total` filas o al recibir una página incompleta (lo
 * que llegue antes). Si el conjunto cambia mientras se recorre, el resultado
 * refleja cada página en el momento en que se pidió, igual que paginar a mano.
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
  const rows: TRow[] = [];
  for (let page = 1; page <= SERVER_LIST_EXPORT_MAX_PAGES; page += 1) {
    const listPage = { page, pageSize };
    const response = await queryFn({ ...criteria, ...adapter.paginationParams(listPage) });
    const parsed = adapter.parse(response, listPage);
    rows.push(...parsed.rows);
    if (parsed.rows.length < pageSize || rows.length >= parsed.total) return rows;
  }
  throw new Error("La lista es demasiado grande para exportarla completa.");
};
