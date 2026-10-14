import { AxiosError } from "axios";
import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";
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

/**
 * Lee un error de escritura del encabezado (`POST onboarding/` del alta o
 * `PUT ordenes/{id}/`) y separa lo que va bajo cada campo de lo que va al
 * toast.
 *
 * El backend responde con dos formas y aquí se atienden ambas:
 * - Errores de su propia lógica (`pedidos` de otra empresa, `tipo_compra` con
 *   folio, catálogos de otra empresa): planos, `{ "pedidos": "..." }`.
 * - Errores del serializer del alta (`referencia` de más de 50, `tipo_compra`
 *   inválido): ANIDADOS bajo `orden_compra`, porque así viaja el body. En el
 *   PUT (body plano) llegan planos.
 *
 * Lo plano lo resuelve `handleDrfWriteError` (que además da el texto del toast
 * para lo que no es de un campo); lo anidado se lee aparte.
 */
export function readPurchaseOrderHeaderErrors(
  error: unknown,
  fallback: string,
): { fieldErrors: PurchaseOrderHeaderFieldErrors; toastMessage: string } {
  const fieldErrors: PurchaseOrderHeaderFieldErrors = {};
  let toastMessage = handleDrfWriteError(
    error,
    fallback,
    PURCHASE_ORDER_HEADER_FIELDS,
    (field, message) => {
      fieldErrors[field] = message;
    },
  );

  const data = error instanceof AxiosError ? error.response?.data : undefined;
  const nested =
    error instanceof AxiosError && error.response?.status === 400 && data && typeof data === "object"
      ? (data as Record<string, unknown>).orden_compra
      : undefined;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const record = nested as Record<string, unknown>;
    for (const field of PURCHASE_ORDER_HEADER_FIELDS) {
      const message = firstDrfMessage(record[field]);
      if (message) fieldErrors[field] ??= message;
    }
  }

  // Sin mensaje general, el toast remite a los campos en vez de quedarse en el
  // respaldo genérico.
  if (toastMessage === fallback && Object.keys(fieldErrors).length > 0) {
    toastMessage = FIELD_ERRORS_TOAST;
  }

  return { fieldErrors, toastMessage };
}
