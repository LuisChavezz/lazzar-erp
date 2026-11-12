import {
  booleanFlagParam,
  defineServerTable,
  enumParam,
  intRangeParam,
  serverTableSetting,
} from "@/src/utils/serverTableParams";
import {
  ROTATION_AGRUPAR,
  ROTATION_CLASES,
  ROTATION_ESTADOS,
  ROTATION_FABRICACION,
} from "../interfaces/rotation-board.interface";
import { ROTATION_CONTROL_LIMITS } from "../schemas/rotationBoardControls.schema";

/**
 * Contrato del tablero con `GET /planeacion/tablero-rotacion/`, en DOS
 * definiciones: por variante (SKU) y por producto (modelo). Comparten los
 * ajustes de cálculo; la de producto no tiene lo que solo existe por variante
 * (`fabricacion`, ordenar por `sku` o `fabricable_con_existencia`): en ese modo
 * el backend lo acepta pero no hace nada.
 *
 * - **Ajustes** (`settings`): `semanas`, `semanas_objetivo`, `dias_sin_venta` y
 *   `agrupar`. Se envían siempre, sobreviven a "Limpiar filtros" y vuelven a
 *   12 / 8 / 90 / variante con "Restablecer". Mismos rangos que el backend.
 * - **Filtros**: `clase`, `estado`, `solo_candidatos` (+ `fabricacion` por
 *   variante). No cambian el `resumen`, así que las tarjetas no se mueven al
 *   filtrar desde ellas. Sin `sucursal` en v1: el backend solo la aplica a la
 *   venta, no al stock.
 * - **Orden**: solo campos con columna. `importe_vendido` queda fuera (en v1 no
 *   se muestra: suma monedas distintas). Sin desempate: el backend rechaza una
 *   lista de campos (`vendido_periodo,-id` → 400) y desempata él mismo por
 *   nombre y SKU.
 * - **Paginación**: `page`/`page_size` (máx. 500), 50 por defecto.
 */
const settings = {
  semanas: serverTableSetting(
    intRangeParam(ROTATION_CONTROL_LIMITS.semanas.min, ROTATION_CONTROL_LIMITS.semanas.max),
    ROTATION_CONTROL_LIMITS.semanas.default,
  ),
  semanas_objetivo: serverTableSetting(
    intRangeParam(
      ROTATION_CONTROL_LIMITS.semanas_objetivo.min,
      ROTATION_CONTROL_LIMITS.semanas_objetivo.max,
    ),
    ROTATION_CONTROL_LIMITS.semanas_objetivo.default,
  ),
  dias_sin_venta: serverTableSetting(
    intRangeParam(
      ROTATION_CONTROL_LIMITS.dias_sin_venta.min,
      ROTATION_CONTROL_LIMITS.dias_sin_venta.max,
    ),
    ROTATION_CONTROL_LIMITS.dias_sin_venta.default,
  ),
  agrupar: serverTableSetting(enumParam(ROTATION_AGRUPAR), "variante"),
};

const commonFilters = {
  clase: enumParam(ROTATION_CLASES),
  estado: enumParam(ROTATION_ESTADOS),
  solo_candidatos: booleanFlagParam,
};

const COMMON_ORDERING_FIELDS = [
  "nombre",
  "clase_abc",
  "vendido_periodo",
  "tendencia_pct",
  "venta_semanal",
  "ultima_venta",
  "existencia",
  "en_proceso",
  "disponible",
  "cobertura_semanas",
  "resurtido_sugerido",
] as const;

/** Campos de orden y filtros que solo existen por variante. */
export const VARIANT_ONLY_ORDERING_FIELDS = ["sku", "fabricable_con_existencia"] as const;
export const VARIANT_ONLY_FILTERS = ["fabricacion"] as const;

export const ROTATION_DEFAULT_ORDERING = "-vendido_periodo";
const PAGE_SIZES = [20, 50, 100, 200] as const;

export const rotationBoardVariantTable = defineServerTable({
  filters: { ...commonFilters, fabricacion: enumParam(ROTATION_FABRICACION) },
  settings,
  search: { param: "buscar", maxLength: 100 },
  ordering: {
    fields: [...COMMON_ORDERING_FIELDS, ...VARIANT_ONLY_ORDERING_FIELDS],
    default: ROTATION_DEFAULT_ORDERING,
  },
  pageSizes: PAGE_SIZES,
  defaultPageSize: 50,
});

export const rotationBoardProductTable = defineServerTable({
  filters: commonFilters,
  settings,
  search: { param: "buscar", maxLength: 100 },
  ordering: { fields: COMMON_ORDERING_FIELDS, default: ROTATION_DEFAULT_ORDERING },
  pageSizes: PAGE_SIZES,
  defaultPageSize: 50,
});
