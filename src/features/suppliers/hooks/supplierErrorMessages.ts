import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import { SupplierFormSchema, type SupplierFormValues } from "../schemas/supplier.schema";

/**
 * Textos de error del alta/edición de proveedores. La lógica de DRF vive en
 * `src/utils/drfWriteErrors.ts`; aquí quedan los campos del formulario.
 *
 * Un error de un campo que el formulario no muestra (`codigo`, que genera el
 * backend, o `non_field_errors`) sale en el toast en vez de perderse.
 */

type SupplierFormField = keyof SupplierFormValues;

const FORM_FIELDS = Object.keys(SupplierFormSchema.shape) as readonly SupplierFormField[];

export type SetSupplierError = (
  field: SupplierFormField,
  error: { type?: string; message?: string }
) => void;

/** Error de alta/edición: ver `handleDrfWriteError`. */
export const handleSupplierWriteError = (
  error: unknown,
  fallback: string,
  setError?: SetSupplierError
): string =>
  handleDrfWriteError(
    error,
    fallback,
    FORM_FIELDS,
    setError ? (field, message) => setError(field, { type: "server", message }) : undefined
  );
