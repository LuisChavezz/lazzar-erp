/**
 * Textos de asistencia que comparten la capa de hooks (errores de las
 * mutaciones) y las reglas puras de `utils/` (cierre de diálogos por datos
 * obsoletos). Viven aquí, sin dependencias, para que `utils/` no importe de
 * `hooks/`.
 */

/** Un registro que otra persona ya borró (404 en un PATCH o DELETE, o ausente tras un refetch). */
export const ATTENDANCE_GONE_MESSAGE =
  "El registro de asistencia ya no existe. Se actualizó el listado.";
