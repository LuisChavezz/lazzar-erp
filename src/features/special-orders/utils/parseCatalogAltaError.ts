import { AxiosError } from "axios";
import { firstDrfMessage, firstRejectionMessage } from "@/src/utils/firstDrfMessage";
import { SAMPLE_SKU_ONBOARDING_FORBIDDEN_MESSAGE } from "./parseSampleSkuOnboardingError";

export const CATALOG_ALTA_GENERIC_ERROR = "No se pudo dar de alta la línea en catálogo.";

/**
 * Llaves de rechazo de `alta-catalogo`, en el orden en que se leen. Cada `400`
 * trae una sola; el orden solo importa si un día llegan juntas.
 */
const REJECTION_KEYS = [
  "permiso",
  "pedido",
  "pedido_detalle_id",
  "alta_catalogo",
  "categoria_producto",
  "detail",
  "non_field_errors",
  "error",
] as const;

export interface ParsedCatalogAltaError {
  /** UNA frase para el toast: el mensaje del backend cuando lo hay. */
  message: string;
  /**
   * Lo que se ve de la línea ya no es cierto (otra sesión ya la dio de alta,
   * o el pedido dejó de estar visible): el detalle debe volver a pedirse.
   */
  staleLine: boolean;
}

/**
 * Normaliza el error de
 * `POST /produccion/pedidos-especiales/{id}/alta-catalogo/`.
 *
 * Formas confirmadas contra `PedidoEspecialViewSet.alta_catalogo`, todas con
 * status **400** salvo el `404` de `get_object`:
 *  - `{"permiso": "..."}`: `_require_produccion` (400, no 403). Se muestra el
 *    mensaje del backend; un 403 real, sin cuerpo útil, usa el aviso del alta
 *    de SKU.
 *  - `{"pedido": "..."}`: el pedido está CANCELADO.
 *  - `{"pedido_detalle_id": "..."}`: falta, la línea no es de este pedido o ya
 *    no le quedan SKU pendientes de alta. Línea obsoleta.
 *  - `{"alta_catalogo": "..."}`: sin categoría, categoría inactiva, tallas
 *    fuera de la categoría o el SKU ya existe en catálogo.
 *  - `{"categoria_producto": "..."}`: se agotaron los códigos de la categoría.
 *  - `404` (`detail`): el pedido ya no es visible. También línea obsoleta.
 *
 * Función pura, sin React, como `parseSampleSkuOnboardingError`.
 */
export function parseCatalogAltaError(error: unknown): ParsedCatalogAltaError {
  const response = error instanceof AxiosError ? error.response : undefined;
  const data: unknown = response?.data;

  const staleLine =
    response?.status === 404 ||
    (Boolean(data) &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      firstDrfMessage((data as Record<string, unknown>).pedido_detalle_id) !== undefined);

  // `ValidationError("texto")` sin campo: DRF lo serializa como arreglo raíz.
  const backendMessage = Array.isArray(data)
    ? firstDrfMessage(data)
    : firstRejectionMessage(data, REJECTION_KEYS);

  if (backendMessage) return { message: backendMessage, staleLine };
  if (response?.status === 403) {
    return { message: SAMPLE_SKU_ONBOARDING_FORBIDDEN_MESSAGE, staleLine };
  }
  // Sin nada utilizable (red, 5xx, cuerpo vacío): nunca el `message` crudo de Axios.
  return { message: CATALOG_ALTA_GENERIC_ERROR, staleLine };
}
