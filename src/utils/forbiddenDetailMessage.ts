import { isAxiosError } from "axios";
import { firstDrfFieldMessage } from "./firstDrfFieldMessage";

/**
 * Motivo de un `403` de DRF (`{"detail": "..."}`), o `undefined` si el error no
 * es un `403` o no trae mensaje.
 *
 * Para las escrituras de Finanzas que caen a un texto fijo: desde EC-711 el
 * backend responde `403` sin `E-FIN-FACTURAS` con un `detail` en español que
 * dice qué falta ("No tienes permiso para modificar datos de finanzas."), y un
 * "Error al registrar…" genérico lo escondía. Solo mira el `403`: el resto de
 * los errores (400 por campo, 5xx, red) conservan el manejo que ya tenían.
 * `extractErrorMessage` y `handleDrfWriteError` no se tocan porque los usan
 * módulos fuera de Finanzas.
 */
export const forbiddenDetailMessage = (error: unknown): string | undefined =>
  isAxiosError(error) && error.response?.status === 403 ? firstDrfFieldMessage(error) : undefined;
