import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";

export const SAMPLE_SKU_ONBOARDING_GENERIC_ERROR =
  "No se pudieron generar los SKU de producción.";

/**
 * Rechazo por departamento. El backend restringe el alta a Producción, admin
 * de empresa o superusuario, y el frontend no conoce el departamento del
 * usuario (la sesión solo trae `role` y `permissions`), así que no puede
 * ocultar la acción de antemano: el aviso llega aquí.
 */
export const SAMPLE_SKU_ONBOARDING_FORBIDDEN_MESSAGE =
  "Esta acción está reservada al departamento de Producción y a los administradores de la empresa.";

const FIELD_ERRORS_TOAST = "Revisa los campos marcados.";

/** Campos de un material que tienen input propio en el Paso 2. */
const MATERIAL_INPUT_FIELDS = ["cantidad", "unidad", "desperdicio", "obligatorio"];

/**
 * Error del alta normalizado para el asistente.
 *
 * `fieldErrors` usa las MISMAS llaves que la validación del cliente (ruta de
 * Zod unida con "."): `color`, `materia_prima_detalle.{i}.{campo}` para los
 * campos con input y `materia_prima_detalle.{i}` para lo que es del renglón
 * pero no tiene input (`componente` o una llave desconocida). El índice es el
 * del arreglo enviado, que es el orden de los renglones en pantalla.
 */
export interface ParsedSampleSkuOnboardingError {
  /** Aviso a nivel de diálogo: no pertenece a ningún input. */
  formError?: string;
  fieldErrors: Record<string, string>;
  /**
   * El rechazo cayó en `pedido_detalle_id`: lo que se muestra de la línea ya
   * no es cierto (típicamente otra sesión ya generó sus SKU), así que el
   * detalle debe volver a pedirse.
   */
  staleLine: boolean;
  /** UNA frase para el toast. */
  toastMessage: string;
}

/**
 * Normaliza el error de
 * `POST /produccion/pedidos-especiales/{id}/variante-onboarding/`.
 *
 * Formas confirmadas contra `PedidoEspecialViewSet.variante_onboarding`:
 *  - `{"permiso": "Acción disponible solo para producción."}` con status
 *    **400** (no 403): `_require_produccion` lanza `ValidationError`. Se trata
 *    igual que un 403 real, por si el backend llega a corregirlo.
 *  - `{"pedido": "..."}` (pedido cancelado) y `{"pedido_detalle_id": "..."}`
 *    (línea con SKU, línea no especial, sin tallas con cantidad, color de la
 *    línea sin código): aviso de diálogo.
 *  - `{"color": "..."}`: bajo el selector de color.
 *  - `{"materia_prima_detalle": [{}, {"cantidad": ["..."]}]}`: un objeto por
 *    renglón enviado (vacío si ese renglón es válido), o un arreglo de strings
 *    cuando el error es de la lista completa.
 *
 * Función pura, sin React, como `parseEmbroideryOrderError`.
 */
export function parseSampleSkuOnboardingError(error: unknown): ParsedSampleSkuOnboardingError {
  const response = error instanceof AxiosError ? error.response : undefined;
  const data: unknown = response?.data;
  const fieldErrors: Record<string, string> = {};
  let formError: string | undefined;
  let staleLine = false;

  const isRecord = Boolean(data) && typeof data === "object" && !Array.isArray(data);
  const record = isRecord ? (data as Record<string, unknown>) : {};

  if (response?.status === 403 || "permiso" in record) {
    formError = SAMPLE_SKU_ONBOARDING_FORBIDDEN_MESSAGE;
  } else if (Array.isArray(data)) {
    // `ValidationError("texto")` sin campo: DRF lo serializa como arreglo raíz.
    formError = firstDrfMessage(data);
  } else {
    for (const [key, value] of Object.entries(record)) {
      if (key === "pedido" || key === "pedido_detalle_id") {
        // `pedido` va primero en el aviso: si el pedido está cancelado, el
        // estado de la línea es irrelevante.
        const message = firstDrfMessage(value);
        if (message && (key === "pedido" || !formError)) formError = message;
        if (key === "pedido_detalle_id") staleLine = true;
      } else if (key === "color") {
        const message = firstDrfMessage(value);
        if (message) fieldErrors.color = message;
      } else if (key === "materia_prima_detalle" && Array.isArray(value)) {
        value.forEach((entry, index) => {
          if (typeof entry === "string") {
            formError ??= entry || undefined;
            return;
          }
          if (!entry || typeof entry !== "object") return;
          for (const [field, fieldValue] of Object.entries(entry as Record<string, unknown>)) {
            const message = firstDrfMessage(fieldValue);
            if (!message) continue;
            const path = MATERIAL_INPUT_FIELDS.includes(field)
              ? `materia_prima_detalle.${index}.${field}`
              : `materia_prima_detalle.${index}`;
            fieldErrors[path] ??= message;
          }
        });
      } else {
        // `detail`, `non_field_errors`, `{ error }` o una llave que este
        // archivo no conoce: no se pierde, va al aviso de diálogo.
        formError ??= firstDrfMessage(value);
      }
    }
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  // Sin nada utilizable (red, 5xx, cuerpo vacío) el aviso es el genérico:
  // nunca el `message` crudo de Axios.
  if (!formError && !hasFieldErrors) formError = SAMPLE_SKU_ONBOARDING_GENERIC_ERROR;

  return {
    formError,
    fieldErrors,
    staleLine,
    toastMessage: formError ?? FIELD_ERRORS_TOAST,
  };
}
