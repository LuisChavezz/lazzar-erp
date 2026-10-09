import { drfActionErrorMessage, handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import { getEstadoNominaLabel } from "../constants/payrollChoices";

/**
 * Textos de error de nóminas. La lógica de DRF vive en
 * `src/utils/drfWriteErrors.ts` (compartida con el resto de RH).
 *
 * `empresa`, `sucursal`, `periodo_inicio` y `periodo_fin` no son campos
 * visibles (se derivan del empleado y de la quincena): un error suyo sale en
 * el toast en vez de perderse.
 */

export type PayrollFormField = "empleado" | "salario_base" | "observaciones" | "detalles";

const FORM_FIELDS: readonly PayrollFormField[] = [
  "empleado",
  "salario_base",
  "observaciones",
  "detalles",
];

export type SetPayrollFieldError = (field: PayrollFormField, message: string) => void;

/** Error de alta/edición: ver `handleDrfWriteError`. */
export const handlePayrollWriteError = (
  error: unknown,
  fallback: string,
  setFieldError?: SetPayrollFieldError
): string => handleDrfWriteError(error, fallback, FORM_FIELDS, setFieldError);

/** Una nómina que ya no existe (404). */
export const PAYROLL_GONE_MESSAGE = "La nómina ya no existe. Se actualizó el listado.";

/** Una nómina que cambió de estado mientras su diálogo estaba abierto. */
export const payrollEstadoChangedMessage = (estado: string): string =>
  `La nómina ya no está pendiente (ahora: «${getEstadoNominaLabel(estado) ?? estado}»). Se actualizó el listado.`;

/** La guarda previa a una escritura no pudo consultar el servidor (red, 5xx). */
export const PAYROLL_CHECK_FAILED_MESSAGE =
  "No se pudo verificar la nómina contra el servidor. Revisa tu conexión e intenta de nuevo.";

/** Error de una acción sobre una nómina: ver `drfActionErrorMessage`. */
export const payrollActionErrorMessage = (error: unknown, fallback: string): string =>
  drfActionErrorMessage(error, fallback, PAYROLL_GONE_MESSAGE);
