import {
  limitOffsetAdapter,
  type PaginatedListResponse,
  type ServerListAdapter,
} from "@/src/utils/serverListAdapters";
import type { EtiquetaRFIDRow } from "../interfaces/rfid-label.interface";

/**
 * Lo que responde `GET /wms/etiquetas-rfid/`: el arreglo completo (backend
 * anterior a EC-989, que ignora `limit`/`offset`) o la página DRF (desde
 * EC-989, que pagina cuando llega `?limit=`).
 */
export type RfidLabelsListResponse = EtiquetaRFIDRow[] | PaginatedListResponse<EtiquetaRFIDRow>;

const paginated = limitOffsetAdapter<EtiquetaRFIDRow>();

/**
 * `limitOffsetAdapter` que además acepta el arreglo completo, mientras EC-989
 * no esté desplegado. Siempre manda `limit`/`offset`.
 *
 * - Página DRF → tal cual (`count`, `results`, `next`).
 * - Arreglo → el total es su longitud y la página pedida se recorta de él, así
 *   que el paginador funciona igual. Búsqueda, filtro y orden NO se aplican en
 *   el cliente: el backend de hoy los ignora y se ven hasta que llegue EC-989.
 *
 * Retirar el caso del arreglo cuando EC-989 esté en producción.
 */
export const rfidLabelsAdapter: ServerListAdapter<RfidLabelsListResponse, EtiquetaRFIDRow> = {
  paginationParams: paginated.paginationParams,
  parse: (response, page) => {
    if (!Array.isArray(response)) return paginated.parse(response, page);
    const start = (page.page - 1) * page.pageSize;
    const end = start + page.pageSize;
    return {
      rows: response.slice(start, end),
      total: response.length,
      hasMore: end < response.length,
    };
  },
  isOutOfRange: paginated.isOutOfRange,
};
