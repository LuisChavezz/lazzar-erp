import type { ACCIONES_BITACORA, TIPOS_DOCUMENTO } from "../constants/documentAuditValues";

/** Tipo de documento que registra la bitácora (`tipo_documento`). */
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

/** Acción registrada (`accion`). */
export type AccionBitacora = (typeof ACCIONES_BITACORA)[number];

/**
 * Un evento de la bitácora (`BitacoraDocumentoSerializer`, nucleo-erp PR #1062
 * y #1072). Mismos campos y nulabilidad que el serializer.
 *
 * - `tipo_documento` y `accion` se tipan como `string`: el backend no los
 *   restringe y la UI debe aguantar un valor que aún no conoce (lo pinta tal
 *   cual en vez de romper). Para comparar, usar los guardas de
 *   `documentAuditValues`.
 * - `documento_id` es texto (`CharField`), aunque hoy siempre sea un entero.
 * - `estatus_anterior` / `estatus_nuevo` son etiquetas legibles y uniformes
 *   entre tipos ("Por autorizar", "Preparación"), también en los eventos
 *   anteriores a #1072. Se muestran como texto, sin badges; vacías en ajustes
 *   de inventario.
 * - `folio`, `estatus_*`, `estatus_codigo` y `origen_tipo` llegan como `""`
 *   cuando no aplican.
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
  /**
   * Código crudo del estatus NUEVO (#1072). `""` al eliminar, en ajustes de
   * inventario y en todo evento registrado antes de #1072.
   */
  estatus_codigo: string;
  /**
   * Decimal como texto (`"1234.50"`) o `null`: el tipo no tiene importe o el
   * usuario no puede ver importes (se pinta "—").
   */
  total: string | null;
  moneda_id: number | null;
  /** `null` en los cobros y pagos registrados antes de que tuvieran sucursal (#1072). */
  sucursal_id: number | null;
  origen_tipo: string;
  origen_id: number | null;
  usuario_id: number | null;
  usuario_nombre: string | null;
}

/**
 * Respuesta de `linea-tiempo/` (nucleo-erp PR #1072): los 500 eventos MÁS
 * RECIENTES del documento y de sus derivados, en orden cronológico.
 * `truncado` es `true` cuando había más y los más antiguos quedaron fuera.
 */
export interface BitacoraLineaTiempo {
  eventos: BitacoraDocumento[];
  truncado: boolean;
}

/** Página del listado: `CursorPagination` de DRF, sin `count`. */
export interface BitacoraDocumentoPage {
  /** URL absoluta de la página siguiente (trae el `cursor`), o `null`. */
  next: string | null;
  previous: string | null;
  results: BitacoraDocumento[];
}
