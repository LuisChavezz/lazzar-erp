import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import type { ProductVariantFormValues } from "../schemas/product-variant.schema";

type ProductVariantFormField = keyof ProductVariantFormValues;

export type SetProductVariantError = (
  field: ProductVariantFormField,
  error: { type?: string; message?: string },
) => void;

const FORM_FIELDS: ProductVariantFormField[] = [
  "producto",
  "color",
  "talla",
  "sku",
  "precio_base",
  "activo",
];

/**
 * Reparte un `400` de `POST/PUT /catalogo/producto-variante/` entre los campos.
 *
 * Tolera las DOS formas de DRF: `{"talla": ["..."]}` (la validación de talla por
 * categoría llega como lista en esta ruta) y `{"talla": "..."}` (forma de la
 * ruta de onboarding). Antes solo se leían listas, así que un mensaje suelto se
 * perdía en silencio.
 *
 * Las llaves que no son campos del formulario (`empresa`, `non_field_errors`,
 * `detail`) no tienen dónde pintarse: las muestra el toast (ver
 * `productVariantErrorToast`).
 */
export const setProductVariantFieldErrors = (
  error: unknown,
  setError?: SetProductVariantError,
): void => {
  if (!setError || !(error instanceof AxiosError)) return;
  if (error.response?.status !== 400) return;

  const data = error.response.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return;

  const record = data as Record<string, unknown>;
  FORM_FIELDS.forEach((field) => {
    const message = firstDrfMessage(record[field]);
    if (message) setError(field, { type: "server", message });
  });
};

/** Texto del toast: el primer motivo real de un 400, o el genérico. */
export const productVariantErrorToast = (error: unknown, fallback: string): string => {
  const isValidationError = error instanceof AxiosError && error.response?.status === 400;
  return isValidationError ? (firstDrfFieldMessage(error) ?? fallback) : fallback;
};
