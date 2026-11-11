import type { ACCIONES_BITACORA, TIPOS_DOCUMENTO } from "../constants/documentAuditValues";

/** Tipo de documento que registra la bitácora (`tipo_documento`). */
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

/** Acción registrada (`accion`). */
export type AccionBitacora = (typeof ACCIONES_BITACORA)[number];

/**
 * Un evento de la bitácora (`BitacoraDocumentoSerializer`, nucleo-erp PR #1062).
 * Mismos campos y nulabilidad que el serializer.
 *
 * - `tipo_documento` y `accion` se tipan como `string`: el backend no los
 *   restringe y la UI debe aguantar un valor que aún no conoce (lo pinta tal
 *   cual en vez de romper). Para comparar, usar los guardas de
 *   `documentAuditValues`.
 * - `documento_id` es texto (`CharField`), aunque hoy siempre sea un entero.
 * - `estatus_anterior` / `estatus_nuevo` son la ETIQUETA de los `choices` de
 *   cada modelo, no uniforme entre tipos (mayúsculas en pedido, sin acentos en
 *   OP, el código en picking, `tipo_movimiento` en movimientos, vacía en
 *   ajustes): se muestran como texto, sin mapear a badges.
 * - `folio`, `estatus_*` y `origen_tipo` llegan como `""` cuando no aplican.
 * - `usuario_id` / `usuario_nombre` son `null` cuando el cambio no vino de una
 *   petición con usuario (procesos internos).
 */
export interface BitacoraDocumento {
  id: number;
  created_at: string;
  tipo_documento: string;
  documento_id: string;
  folio: string;
  accion: string;
  accion_display: string;
  estatus_anterior: string;
  estatus_nuevo: string;
  /** Decimal como texto (`"1234.50"`) o `null`. */
  total: string | null;
  moneda_id: number | null;
  /** Siempre `null` en cobros y pagos (sus modelos no tienen sucursal). */
  sucursal_id: number | null;
  origen_tipo: string;
  origen_id: number | null;
  usuario_id: number | null;
  usuario_nombre: string | null;
}

/** Página del listado: `CursorPagination` de DRF, sin `count`. */
export interface BitacoraDocumentoPage {
  /** URL absoluta de la página siguiente (trae el `cursor`), o `null`. */
  next: string | null;
  previous: string | null;
  results: BitacoraDocumento[];
}
