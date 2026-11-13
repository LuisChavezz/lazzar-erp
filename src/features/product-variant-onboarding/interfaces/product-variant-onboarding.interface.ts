import type { Color } from "../../colors/interfaces/color.interface";
import type { Product } from "../../products/interfaces/product.interface";
import type { ProductVariant } from "../../product-variants/interfaces/product-variant.interface";
import type { Size } from "../../sizes/interfaces/size.interface";

/**
 * Cuerpo de `POST /catalogo/producto-variante/onboarding/`
 * (`ProductoVarianteOnboardingSerializer`).
 *
 * Son EXACTAMENTE los cuatro campos que el backend usa. `sku` es de solo lectura
 * (lo genera el servidor) y `nombre`, `cod_proscai`, `empresa` y `activo` se
 * descartan en silencio, así que no se envían.
 *
 * `talla` es `null` salvo para productos PT, donde el backend la exige
 * ("Requerida para variantes de Producto Terminado.").
 */
export interface ProductVariantOnboardingPayload {
  producto: Product["id"];
  color: Color["id"];
  talla: Size["id"] | null;
  precio_base: string;
}

/**
 * Respuesta 201: `ProductoVarianteSerializer` completo, la misma forma que el
 * listado (incluido `talla_nombre` ausente cuando `talla` es null).
 */
export type ProductVariantOnboardingResult = ProductVariant;
