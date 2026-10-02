import { drfActionErrorMessage, handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import type { ProductivityFormValues } from "../schemas/productivity.schema";
import { getEstadoProductividadLabel } from "../constants/productivityChoices";

/**
 * Textos de error de productividad. La lógica de DRF vive en
 * `src/utils/drfWriteErrors.ts` (compartida con vacaciones y ausencias); aquí
 * quedan los campos del formulario y los mensajes propios del módulo.
 *
 * `empresa` y `departamento` no están en `FORM_FIELDS`: no son campos
 * visibles, así que un error suyo (p. ej. el 400 de empresa ajena) sale en el
 * toast en vez de perderse.
 */

type ProductivityFormField = keyof ProductivityFormValues;

const FORM_FIELDS: readonly ProductivityFormField[] = [
  "empleado",
  "fecha",
  "meta_unidad",
  "meta",
  "resultado",
  "descripcion",
];

export type SetProductivityFieldError = (field: ProductivityFormField, message: string) => void;

/** Error de alta/edición: ver `handleDrfWriteError`. */
export const handleProductivityWriteError = (
  error: unknown,
  fallback: string,
  setFieldError?: SetProductivityFieldError
): string => handleDrfWriteError(error, fallback, FORM_FIELDS, setFieldError);

/** Un registro que otra persona ya borró (404). */
export const PRODUCTIVITY_GONE_MESSAGE = "El registro ya no existe. Se actualizó el listado.";

/**
 * Un registro que cambió de estado mientras su diálogo estaba abierto. Lo
 * comparten la guarda de red (`verifyProductivityEstado`) y la vía rápida de
 * la caché (`ProductivityList`, `useProductivityForm`).
 */
export const productivityEstadoChangedMessage = (estado: string): string =>
  `El registro cambió de estado (ahora: «${getEstadoProductividadLabel(estado) ?? estado}»). Se actualizó el listado.`;

/** La guarda previa a una escritura no pudo consultar el servidor (red, 5xx). */
export const PRODUCTIVITY_CHECK_FAILED_MESSAGE =
  "No se pudo verificar el registro contra el servidor. Revisa tu conexión e intenta de nuevo.";

/** Error de una acción sobre un registro: ver `drfActionErrorMessage`. */
export const productivityActionErrorMessage = (error: unknown, fallback: string): string =>
  drfActionErrorMessage(error, fallback, PRODUCTIVITY_GONE_MESSAGE);
