import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { isWholeArrayDrfError } from "@/src/utils/isWholeArrayDrfError";

/** Campos del renglón con control propio en el formulario: su error se pinta bajo él. */
const RENDERED_LINE_FIELDS = new Set(["tipo", "codigo", "concepto", "monto"]);

/**
 * Nombre legible de los campos que la captura NO muestra (`cantidad` y
 * `unidad` viajan ocultos), para que su error se entienda en el aviso del
 * renglón.
 */
const HIDDEN_LINE_FIELD_LABELS: Record<string, string> = {
  cantidad: "Cantidad",
  unidad: "Unidad",
};

/**
 * Errores por renglón de un 400 sobre `detalles`. DRF los manda alineados por
 * índice (`{"detalles": [{}, {"monto": ["..."]}]}`):
 *
 * - Un campo con control propio va a su clave (`detalles.1.monto`).
 * - Cualquier otro (`cantidad`, `unidad`, `non_field_errors` o uno que el
 *   backend agregue) va al aviso del renglón (`detalles.1._form`), que el
 *   formulario pinta debajo de la fila: si no, el toast diría "revisa los
 *   renglones marcados" sin ninguno marcado.
 * - Un error del arreglo completo (`{"detalles": ["..."]}`) va a `detalles`.
 *
 * Vacío si el error no es un 400 con `detalles`.
 */
export const parsePayrollLineErrors = (error: unknown): Record<string, string> => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) {
    return {};
  }
  const data = error.response.data as Record<string, unknown> | undefined;
  const detalles = data && typeof data === "object" ? data.detalles : undefined;
  if (!Array.isArray(detalles)) {
    return {};
  }
  if (isWholeArrayDrfError(detalles)) {
    const message = firstDrfMessage(detalles);
    return message ? { detalles: message } : {};
  }

  const result: Record<string, string> = {};
  detalles.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const lineMessages: string[] = [];
    Object.entries(entry as Record<string, unknown>).forEach(([field, value]) => {
      const message = firstDrfMessage(value);
      if (!message) return;
      if (RENDERED_LINE_FIELDS.has(field)) {
        result[`detalles.${index}.${field}`] = message;
      } else if (field === "non_field_errors") {
        lineMessages.push(message);
      } else {
        lineMessages.push(`${HIDDEN_LINE_FIELD_LABELS[field] ?? field}: ${message}`);
      }
    });
    if (lineMessages.length > 0) {
      result[`detalles.${index}._form`] = lineMessages.join(" ");
    }
  });
  return result;
};
