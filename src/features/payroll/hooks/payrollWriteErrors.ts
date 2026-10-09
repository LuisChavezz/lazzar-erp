import toast from "react-hot-toast";
import { parsePayrollLineErrors } from "../utils/parsePayrollLineErrors";
import { handlePayrollWriteError, type SetPayrollFieldError } from "./payrollErrorMessages";

export interface PayrollWriteErrorHandlers {
  /** Errores de campo de la cabecera (bajo su campo). */
  setFieldError?: SetPayrollFieldError;
  /** Errores por renglón (`detalles.<i>.<campo>`), bajo su campo del renglón. */
  setLineErrors?: (errors: Record<string, string>) => void;
}

/**
 * Error de alta o edición: pinta los de campo y de renglón y avisa por toast.
 * Si el único detalle está en los renglones, el toast lo dice en vez de caer
 * al respaldo genérico.
 */
export const notifyPayrollWriteError = (
  error: unknown,
  fallback: string,
  { setFieldError, setLineErrors }: PayrollWriteErrorHandlers
) => {
  console.error(error);
  const lineErrors = parsePayrollLineErrors(error);
  const hasLineErrors = Object.keys(lineErrors).length > 0;
  if (hasLineErrors && setLineErrors) {
    setLineErrors(lineErrors);
  }
  const message = handlePayrollWriteError(error, fallback, setFieldError);
  toast.error(message === fallback && hasLineErrors ? "Revisa los renglones marcados." : message);
};
