import {
  dateParam,
  defineServerTable,
  enumParam,
  type ServerTableFilterValues,
  type ServerTableParam,
} from "@/src/utils/serverTableParams";
import { parsePositiveId } from "@/src/utils/parsePositiveId";
import { MAX_AUDIT_FOLIO_LENGTH, MAX_AUDIT_ID } from "../schemas/documentAuditFilters.schema";
import { ACCIONES_BITACORA, TIPOS_DOCUMENTO } from "./documentAuditValues";

/** Id entero positivo dentro de lo que el backend compara (32 bits). */
const auditIdParam: ServerTableParam<number> = {
  parse: (raw) => {
    const id = parsePositiveId(raw);
    return id !== null && id <= MAX_AUDIT_ID ? id : null;
  },
  serialize: (value) => String(value),
};

/** Folio "contiene": recortado, no vacío y dentro del `max_length` del campo. */
const folioParam: ServerTableParam<string> = {
  parse: (raw) => {
    const folio = raw.trim();
    return folio !== "" && folio.length <= MAX_AUDIT_FOLIO_LENGTH ? folio : null;
  },
  serialize: (value) => value,
};

/**
 * Filtros de la bitácora en la URL (`?tipo=pedido&fecha_desde=…`). Reusa los
 * códecs de las listas en modo servidor solo para LEER y ESCRIBIR la URL; la
 * lista no usa `useServerTable` (es por cursor, sin páginas ni total).
 *
 * Sin `search` ni `ordering` a propósito: el endpoint no busca y su orden
 * (`-id`) es el único que el cursor soporta.
 */
export const DOCUMENT_AUDIT_TABLE = defineServerTable({
  filters: {
    tipo: enumParam(TIPOS_DOCUMENTO),
    accion: enumParam(ACCIONES_BITACORA),
    usuario: auditIdParam,
    sucursal: auditIdParam,
    fecha_desde: dateParam,
    fecha_hasta: dateParam,
    folio: folioParam,
  },
  dateRanges: [{ from: "fecha_desde", to: "fecha_hasta" }],
});

export type DocumentAuditFilterValues = ServerTableFilterValues<
  (typeof DOCUMENT_AUDIT_TABLE)["filters"]
>;

export type DocumentAuditFilterKey = keyof DocumentAuditFilterValues;
