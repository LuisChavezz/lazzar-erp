import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { firstNestedDrfMessage } from "./firstDrfMessage";

/**
 * Toast de error de una mutación cuyo 400 es un cuerpo de DRF (con o sin
 * errores anidados por renglón): muestra su primer mensaje con
 * `firstNestedDrfMessage` y, si no trae ninguno o no es un 400, el `fallback`.
 * Nunca pasa al toast algo que no sea un string (EC-898).
 */
export function toastDrfError(error: unknown, fallback: string): void {
  if (isAxiosError(error) && error.response?.status === 400) {
    const message = firstNestedDrfMessage(error.response.data);
    if (message) {
      toast.error(message);
      return;
    }
  }
  toast.error(fallback);
}
