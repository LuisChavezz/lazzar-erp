/**
 * Parámetro de la query que abre el detalle de una solicitud de RH en su
 * listado (`/hr/vacations?solicitud=12`, `/hr/absences?solicitud=7`). Lo
 * escriben los destinos de las notificaciones de RH (EC-935) y lo leen
 * `VacationList` y `AbsenceList` con `useUrlDetailParam`.
 */
export const HR_SOLICITUD_PARAM = "solicitud";
