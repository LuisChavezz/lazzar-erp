import { drfFieldMessage } from "./firstDrfFieldMessage";

/**
 * Mensaje del backend cuando el SAT dejó una cancelación de CFDI en
 * `requested`: el receptor debe aceptarla. Llega como `400` bajo la llave
 * `cancelacion_pendiente`, la MISMA en `POST /finanzas/facturas/{id}/cancelar/`
 * y en `POST /finanzas/cobros/{id}/cancelar-rep/`. Se reconoce por esa LLAVE,
 * nunca por el texto, y se muestra tal cual. `undefined` si el error no es ese.
 */
export const cancelacionPendienteMessage = (error: unknown): string | undefined =>
  drfFieldMessage(error, "cancelacion_pendiente");
