import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
import type { ProductOnboardingFormField } from "../schemas/product-onboarding.schema";

export type SetProductOnboardingError = (
  field: ProductOnboardingFormField,
  error: { type?: string; message?: string },
) => void;

const FORM_FIELDS: ProductOnboardingFormField[] = [
  "nombre",
  "tipo",
  "categoria_producto",
  "precio_base",
];

/**
 * Reparte un `400` del onboarding entre los campos del formulario.
 *
 * El endpoint mezcla las DOS formas de error de DRF bajo la misma llave:
 *  - `{"categoria_producto": ["..."]}` — validación del serializer (PK
 *    inexistente, requerido, formato de decimal...).
 *  - `{"categoria_producto": "..."}` — `ValidationError` levantado a mano en la
 *    vista ("No pertenece a tu empresa.") y en `siguiente_codigo_producto`
 *    ("Se agotaron los codigos disponibles..."). DRF NO lo envuelve en arreglo.
 * `firstDrfMessage` acepta ambas. Las llaves que no son campos del formulario
 * (`non_field_errors`, `detail`) las cubre el toast de la mutación.
 */
export const setProductOnboardingFieldErrors = (
  error: unknown,
  setError?: SetProductOnboardingError,
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
