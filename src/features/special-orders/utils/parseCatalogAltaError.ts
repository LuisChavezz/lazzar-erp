import { AxiosError } from "axios";
import { firstDrfMessage } from "@/src/utils/firstDrfMessage";
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

type CatalogAltaRejectionKey = (typeof REJECTION_KEYS)[number];

export interface ParsedCatalogAltaError {
  /** UNA frase para el toast: el mensaje del backend cuando lo hay. */
  message: string;
  /**
   * Lo que se ve de la línea ya no es cierto (otra sesión ya la dio de alta,
   * el pedido se canceló o dejó de estar visible): el detalle debe volver a
   * pedirse.
   */
  staleLine: boolean;
  /** Llave del `400` de la que salió `message`; `null` sin cuerpo utilizable. */
  key: CatalogAltaRejectionKey | null;
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
 *  - `{"pedido": "..."}`: el pedido está CANCELADO. Línea obsoleta: el
 *    detalle en pantalla aún no lo sabe.
 *  - `{"pedido_detalle_id": "..."}`: falta, la línea no es de este pedido o ya
 *    no le quedan SKU pendientes de alta. Línea obsoleta.
 *  - `{"alta_catalogo": "..."}`: sin categoría, categoría inactiva, tallas
 *    fuera de la categoría o el SKU ya existe en catálogo.
 *  - `{"categoria_producto": "..."}`: dos sentidos. "Categoría no válida."
 *    cuando la elegida para una línea sin categoría es de otra empresa o no
 *    existe; o se agotaron los códigos de la categoría.
 *  - `404` (`detail`): el pedido ya no es visible. También línea obsoleta.
 *
 * Función pura, sin React, como `parseSampleSkuOnboardingError`.
 */
export function parseCatalogAltaError(error: unknown): ParsedCatalogAltaError {
  const response = error instanceof AxiosError ? error.response : undefined;
  const data: unknown = response?.data;

  const record =
    Boolean(data) && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  // `pedido` (cancelado) también: el detalle en pantalla aún trae el estatus viejo.
  const staleLine =
    response?.status === 404 ||
    firstDrfMessage(record.pedido) !== undefined ||
    firstDrfMessage(record.pedido_detalle_id) !== undefined;

  // `ValidationError("texto")` sin campo: DRF lo serializa como arreglo raíz.
  if (Array.isArray(data)) {
    const message = firstDrfMessage(data);
    if (message) return { message, staleLine, key: null };
  } else {
    for (const key of REJECTION_KEYS) {
      const message = firstDrfMessage(record[key]);
      if (message) return { message, staleLine, key };
    }
  }

  if (response?.status === 403) {
    return { message: SAMPLE_SKU_ONBOARDING_FORBIDDEN_MESSAGE, staleLine, key: null };
  }
  // Sin nada utilizable (red, 5xx, cuerpo vacío): nunca el `message` crudo de Axios.
  return { message: CATALOG_ALTA_GENERIC_ERROR, staleLine, key: null };
}

/**
 * Rechazo que depende de la categoría con la que se da de alta (`alta_catalogo`
 * o `categoria_producto`): al elegirla en el diálogo, se muestra ahí y se puede
 * elegir otra sin cerrarlo.
 */
export const isCategoryRejection = (parsed: ParsedCatalogAltaError): boolean =>
  parsed.key === "alta_catalogo" || parsed.key === "categoria_producto";
