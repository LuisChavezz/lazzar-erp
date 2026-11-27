import { defineServerTable, enumParam } from "@/src/utils/serverTableParams";
import type { EtiquetaRFIDStatus } from "../interfaces/rfid-label.interface";

export const RFID_LABEL_STATUS_VALUES = [
  "PENDIENTE",
  "EXITO",
  "FALLIDO",
] as const satisfies readonly EtiquetaRFIDStatus[];

/**
 * Contrato del listado con `GET /wms/etiquetas-rfid/` desde EC-989
 * (nucleo-erp#1487): `PaginacionOpcionalLimitOffset` (la tabla siempre manda
 * `limit`/`offset`), `?search=` (folio, SKU, producto y variante), `?status=` y
 * `?ordering=` con `-created_at` por defecto.
 *
 * Transición: el backend anterior a EC-989 ignora todos estos parámetros y
 * responde el arreglo completo. `rfidLabelsAdapter` lo acepta igual; hasta que
 * EC-989 se despliegue, la búsqueda, el filtro y el orden no surten efecto.
 *
 * - `ordering` usa los nombres de columna de la lista blanca del backend, no
 *   rutas del ORM: el backend traduce `folio` → `id`, `sku` →
 *   `producto_variante__sku`, etc. Un campo fuera de esa lista se descarta sin
 *   error.
 * - Sin `tiebreaker`: el backend añade el desempate por `id` en la dirección
 *   del primer campo, e `id` no está en su lista blanca.
 */
export const rfidLabelsTable = defineServerTable({
  filters: {
    status: enumParam(RFID_LABEL_STATUS_VALUES),
  },
  search: { param: "search" },
  ordering: {
    fields: [
      "folio",
      "sku",
      "producto_nombre",
      "producto_variante_nombre",
      "cantidad",
      "status",
      "created_at",
    ],
    default: "-created_at",
  },
});
