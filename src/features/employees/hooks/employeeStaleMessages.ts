/**
 * Avisos de un diálogo de fila (desactivar, reactivar) que se cerró porque el
 * empleado cambió por fuera mientras estaba abierto (refetch, otra pestaña).
 * Mismo criterio y redacción que `VACATION_GONE_MESSAGE` /
 * `vacationEstadoChangedMessage`.
 */

/** El empleado ya no está en el listado. */
export const EMPLOYEE_GONE_MESSAGE = "El empleado ya no existe. Se actualizó el listado.";

/** El empleado cambió de estatus (`activo`) mientras su diálogo estaba abierto. */
export const employeeActivoChangedMessage = (activo: boolean): string =>
  `El empleado cambió de estatus: ya está ${activo ? "activo" : "inactivo"}. Se actualizó el listado.`;
