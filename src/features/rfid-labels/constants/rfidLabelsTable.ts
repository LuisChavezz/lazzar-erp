import { defineServerTable, enumParam } from "@/src/utils/serverTableParams";
import type { EtiquetaRFIDStatus } from "../interfaces/rfid-label.interface";

export const RFID_LABEL_STATUS_VALUES = [
  "PENDIENTE",
  "EXITO",
  "FALLIDO",
] as const satisfies readonly EtiquetaRFIDStatus[];

/**
 * Contrato del listado con `GET /wms/etiquetas-rfid/` desde EC-989
 * (nucleo-erp): `PaginacionOpcionalLimitOffset` (la tabla siempre manda
 * `limit`/`offset`), `?search=` (folio, SKU, producto y variante), `?status=` y
 * `?ordering=` con `-created_at` por defecto.
 *
 * Transición: el backend anterior a EC-989 ignora todos estos parámetros y
 * responde el arreglo completo. `rfidLabelsAdapter` lo acepta igual; hasta que
 * EC-989 se despliegue, la búsqueda, el filtro y el orden no surten efecto.
 *
 * - `folio` es una propiedad del modelo (sale del `id`), por eso se ordena por `id`.
 * - SKU, producto y variante se ordenan por su ruta en el modelo, como el resto
 *   de los listados en modo servidor (`proveedor__nombre`).
 */
export const rfidLabelsTable = defineServerTable({
  filters: {
    status: enumParam(RFID_LABEL_STATUS_VALUES),
  },
  search: { param: "search" },
  ordering: {
    fields: [
      "id",
      "producto_variante__sku",
      "producto__nombre",
      "producto_variante__nombre",
      "cantidad",
      "status",
      "created_at",
    ],
    default: "-created_at",
    tiebreaker: "-id",
  },
});
