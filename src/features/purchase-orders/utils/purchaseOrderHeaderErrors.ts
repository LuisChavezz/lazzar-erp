import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";

/**
 * Campos del encabezado de la orden de compra que el formulario muestra (con
 * su nombre del API, plano). Un 400 del backend sobre cualquiera de ellos se
 * pinta bajo su campo en el Step 1.
 */
export const PURCHASE_ORDER_HEADER_FIELDS = [
  "sucursal",
  "proveedor",
  "moneda",
  "fecha_vencimiento",
  "referencia",
  "observaciones",
  "tipo_compra",
  "pedidos",
] as const;

export type PurchaseOrderHeaderField = (typeof PURCHASE_ORDER_HEADER_FIELDS)[number];

export type PurchaseOrderHeaderFieldErrors = Partial<Record<PurchaseOrderHeaderField, string>>;

/** Toast cuando todos los errores quedaron bajo su campo. */
const FIELD_ERRORS_TOAST = "Revisa los datos generales de la orden.";

/** Claves de DRF que describen el error completo, no un campo. */
const GENERAL_KEYS = new Set(["non_field_errors", "detail"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isHeaderField = (key: string): key is PurchaseOrderHeaderField =>
  (PURCHASE_ORDER_HEADER_FIELDS as readonly string[]).includes(key);

/**
 * Mensaje de un campo. Además de `"msg"` / `["msg"]`, entiende el error POR
 * ELEMENTO de un `ListField` (`pedidos`): `{"0": ["msg"]}` o `[[], ["msg"]]`,
 * del que se toma el primer mensaje.
 */
const fieldMessage = (value: unknown): string | undefined => {
  const direct = firstDrfMessage(value);
  if (direct) return direct;
  const entries = Array.isArray(value) ? value : isRecord(value) ? Object.values(value) : [];
  for (const entry of entries) {
    const message = firstDrfMessage(entry);
    if (message) return message;
  }
  return undefined;
};

/**
 * Lee un error de escritura del encabezado (`POST onboarding/` del alta o
 * `PUT ordenes/{id}/`) y separa lo que va bajo cada campo de lo que va al
 * toast.
 *
 * El backend responde con dos formas y aquí se atienden ambas:
 * - Errores de su propia lógica (`pedidos` de otra empresa, `tipo_compra` con
 *   folio, catálogos de otra empresa): planos, `{ "pedidos": "..." }`.
 * - Errores del serializer del alta (`referencia` de más de 50, `tipo_compra`
 *   inválido, error por elemento de `pedidos`, `non_field_errors`): ANIDADOS
 *   bajo `orden_compra`, porque así viaja el body. En el PUT (body plano)
 *   llegan planos.
 *
 * Toast: el mensaje GENERAL (`non_field_errors`/`detail`, plano o anidado) si
 * lo hay; si no, el de una clave que el formulario no muestra; si todo quedó
 * bajo sus campos, un aviso que remite a ellos; y el respaldo en cualquier
 * otro caso (red, 5xx, 400 sin mensajes legibles).
 */
export function readPurchaseOrderHeaderErrors(
  error: unknown,
  fallback: string,
): { fieldErrors: PurchaseOrderHeaderFieldErrors; toastMessage: string } {
  const fieldErrors: PurchaseOrderHeaderFieldErrors = {};
  const data =
    error instanceof AxiosError && error.response?.status === 400
      ? error.response.data
      : undefined;
  if (!isRecord(data)) {
    return { fieldErrors, toastMessage: fallback };
  }

  let generalMessage: string | undefined;
  let hiddenFieldMessage: string | undefined;

  // Plano primero: lo anidado solo completa lo que lo plano no dijo.
  const nested = isRecord(data.orden_compra) ? data.orden_compra : {};
  for (const record of [data, nested]) {
    for (const [key, value] of Object.entries(record)) {
      if (record === data && key === "orden_compra") continue;
      if (GENERAL_KEYS.has(key)) {
        generalMessage ??= firstDrfMessage(value);
      } else if (isHeaderField(key)) {
        const message = fieldMessage(value);
        if (message) fieldErrors[key] ??= message;
      } else {
        hiddenFieldMessage ??= firstDrfMessage(value);
      }
    }
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  return {
    fieldErrors,
    toastMessage:
      generalMessage ??
      hiddenFieldMessage ??
      (hasFieldErrors ? FIELD_ERRORS_TOAST : fallback),
  };
}
