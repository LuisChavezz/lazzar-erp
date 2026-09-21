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
 * Respuesta 201: `ProductoVarianteSerializer` completo.
 *
 * `talla_nombre` NO viene en el JSON cuando `talla` es null: DRF omite la clave
 * (verificado serializando una variante sin talla). Por eso es opcional aquí,
 * aunque `ProductVariant` la declare obligatoria.
 */
export type ProductVariantOnboardingResult = Omit<ProductVariant, "talla_nombre"> & {
  talla_nombre?: string;
};
