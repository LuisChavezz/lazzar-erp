import {
  forbiddenDetailMessage,
  handleDrfWriteError,
  isForbiddenError,
  isNotFoundError,
} from "@/src/utils/drfWriteErrors";
import {
  PURCHASE_ORDER_CRITICAL_PATH_FORM_FIELDS,
  type PurchaseOrderCriticalPathField,
} from "../schemas/purchase-order-critical-path.schema";

/** 404: la OC no existe, está inactiva o es de otra empresa (el backend no distingue). */
export const PURCHASE_ORDER_CRITICAL_PATH_NOT_FOUND_MESSAGE =
  "No se encontró la orden de compra. Puede que ya no exista o que no pertenezca a tu empresa.";

/**
 * Respaldo de un 403 sin `detail`. El backend normalmente sí lo trae: "No
 * tienes permiso para editar la ruta crítica de la orden de compra."
 */
export const PURCHASE_ORDER_CRITICAL_PATH_FORBIDDEN_MESSAGE =
  "No tienes permiso para editar la ruta crítica de órdenes de compra.";

export const PURCHASE_ORDER_CRITICAL_PATH_SAVE_FALLBACK = "No se pudo guardar la ruta crítica.";

/**
 * Mensaje del toast de un PATCH fallido de la ruta crítica de la OC.
 *
 * - 404: la OC no se encontró.
 * - 403: el `detail` del backend (`forbiddenDetailMessage`), o un texto fijo de
 *   permiso si no trae. El PATCH exige `E-COMPRAS-OC`; sin él el diálogo ya es
 *   de solo lectura, así que esto llega cuando la sesión quedó con permisos
 *   viejos. Un 403 del chequeo de origen también trae su `detail` y se muestra
 *   tal cual en vez de decir "sin permiso".
 * - 400: cada mensaje bajo su campo (`setFieldError`) y uno de un campo que el
 *   formulario no muestra al toast (`handleDrfWriteError`).
 * - Red, 5xx y el resto: el texto genérico.
 */
export const purchaseOrderCriticalPathSaveErrorMessage = (
  error: unknown,
  setFieldError?: (field: PurchaseOrderCriticalPathField, message: string) => void,
): string => {
  if (isNotFoundError(error)) return PURCHASE_ORDER_CRITICAL_PATH_NOT_FOUND_MESSAGE;
  if (isForbiddenError(error)) {
    return forbiddenDetailMessage(error) ?? PURCHASE_ORDER_CRITICAL_PATH_FORBIDDEN_MESSAGE;
  }
  return handleDrfWriteError(
    error,
    PURCHASE_ORDER_CRITICAL_PATH_SAVE_FALLBACK,
    PURCHASE_ORDER_CRITICAL_PATH_FORM_FIELDS,
    setFieldError,
  );
};
