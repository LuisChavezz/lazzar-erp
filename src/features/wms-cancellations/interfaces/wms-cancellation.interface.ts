/**
 * Quién, cuándo y por qué se canceló un documento de WMS (nucleo-erp #1348 y
 * EC-949): picking, packing, despacho y transferencia, en su listado y su
 * detalle. Cancelar no borra: el documento conserva su folio y queda en su
 * estado cancelado (picking `"Cancelado"`, packing y despacho `"CANCELADO"`,
 * TR `"CANCELADA"`).
 *
 * Opcionales a propósito: `cancelado_por_nombre` llega con EC-949, y un
 * documento leído de una versión anterior del backend no trae ninguno. Sin
 * cancelar: `motivo_cancelacion` es `""` y los demás `null`.
 */
export interface WmsCancellationFields {
  motivo_cancelacion?: string;
  fecha_cancelacion?: string | null;
  /** Id del usuario que canceló; para mostrarlo se usa `cancelado_por_nombre`. */
  cancelado_por?: number | null;
  /** Nombre completo o, si no tiene, su correo (EC-949). */
  cancelado_por_nombre?: string | null;
}
