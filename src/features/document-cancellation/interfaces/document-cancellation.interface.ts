/**
 * Quién, cuándo y por qué se canceló un documento: los cuatro campos con que
 * nucleo-erp lo expone en WMS (#1348, EC-949), Compras (EC-926) y Producción
 * (#1355, EC-966). Cancelar no borra: el documento conserva su folio y queda en
 * su estado cancelado.
 *
 * Opcionales a propósito: un documento leído de una versión anterior del
 * backend no trae ninguno. Sin cancelar: `motivo_cancelacion` es `""` y los
 * demás `null`.
 */
export interface DocumentCancellationFields {
  motivo_cancelacion?: string;
  fecha_cancelacion?: string | null;
  /** Id del usuario que canceló; para mostrarlo se usa `cancelado_por_nombre`. */
  cancelado_por?: number | null;
  /** Nombre completo o, si no tiene, su correo. */
  cancelado_por_nombre?: string | null;
}
