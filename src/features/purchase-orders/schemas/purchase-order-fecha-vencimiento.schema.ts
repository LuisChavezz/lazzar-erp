import { z } from "zod";
import { isCompleteDateEntry } from "@/src/utils/formatDate";

export const FECHA_VENCIMIENTO_INVALIDA_MESSAGE = "La fecha de vencimiento no es válida";

/**
 * `fecha_vencimiento` de la orden de compra (`DateField` nullable en el
 * backend), compartida por el alta y la edición.
 *
 * - Vacía → `null`: sin fecha de vencimiento. En la edición `null` la BORRA en
 *   el backend, así que vaciar el campo sí limpia el valor guardado.
 * - Capturada → un día REAL "yyyy-mm-dd" (`isCompleteDateEntry`). El PUT de
 *   edición viaja plano y en esa forma el backend asigna el campo SIN validarlo
 *   (una fecha mal formada responde 500), así que este schema es la única
 *   garantía de que solo salga un "yyyy-mm-dd" válido o `null`, nunca `""`.
 * - No anterior a `getMinDate()`. Comparación de strings "yyyy-mm-dd" (orden
 *   lexicográfico = cronológico), nunca vía `new Date(...)` sobre la fecha
 *   pelada, que la leería en UTC. Es una función para que el alta lea "hoy" al
 *   validar y no al cargar el módulo; `null` omite la regla.
 */
export const createFechaVencimientoSchema = (
  getMinDate: () => string | null,
  minMessage: string,
) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") return;
      if (!isCompleteDateEntry(value)) {
        ctx.addIssue({ code: "custom", message: FECHA_VENCIMIENTO_INVALIDA_MESSAGE });
        return;
      }
      const minDate = getMinDate();
      if (minDate && value < minDate) {
        ctx.addIssue({ code: "custom", message: minMessage });
      }
    })
    .transform((value) => (value === "" ? null : value));
