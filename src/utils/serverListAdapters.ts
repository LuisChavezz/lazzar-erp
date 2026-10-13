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
