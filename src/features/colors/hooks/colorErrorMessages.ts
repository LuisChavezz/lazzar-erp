import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import type { ColorFormValues } from "../schemas/color.schema";

/**
 * Textos de error del catálogo de colores. La lógica de DRF vive en
 * `src/utils/drfWriteErrors.ts`; aquí quedan los campos del formulario.
 *
 * Los nombres de campo del formulario son los del backend, así que cada error
 * cae bajo su campo; uno sin campo (`non_field_errors`, `detail` u otra clave)
 * sale en el toast.
 */

type ColorFormField = keyof ColorFormValues;

const FORM_FIELDS: readonly ColorFormField[] = ["nombre", "codigo", "codigo_hex"];

export type SetColorFieldError = (field: ColorFormField, message: string) => void;

/** Error de alta/edición: ver `handleDrfWriteError`. */
export const handleColorWriteError = (
  error: unknown,
  fallback: string,
  setFieldError?: SetColorFieldError
): string => handleDrfWriteError(error, fallback, FORM_FIELDS, setFieldError);
