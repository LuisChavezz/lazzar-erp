import type { ProductCategory } from "../../product-categories/interfaces/product-category.interface";
import type { ProductType } from "../../product-types/interfaces/product-type.interface";
import type { Product } from "../../products/interfaces/product.interface";

/**
 * Cuerpo de `POST /catalogo/producto/onboarding/` (`ProductoOnboardingSerializer`).
 *
 * Son EXACTAMENTE los cuatro campos que el serializer declara; cualquier otro
 * (`codigo`, `descripcion`, `empresa`...) se descarta en silencio y responde
 * 201 igual, así que mandarlo sugeriría falsamente que el cliente lo controla:
 *  - `codigo` lo genera el backend (prefijo de la categoría + consecutivo).
 *  - `empresa` sale de `request.user.empresa`.
 *  - `descripcion` no existe en el alta rápida.
 *
 * `tipo` es el PK de `TipoProducto` (`PrimaryKeyRelatedField`), NO su `codigo`.
 * `precio_base` viaja como string decimal canónico (2 decimales) para no
 * arrastrar ruido de punto flotante al `DecimalField(10, 2)`.
 */
export interface ProductOnboardingPayload {
  nombre: string;
  tipo: ProductType["id"];
  categoria_producto: ProductCategory["id"];
  precio_base: string;
}

/**
 * Respuesta 201: `ProductoSerializer` completo (`fields='__all__'`).
 *
 * Se parte de `Product` pero se corrige `tipo`: en el modelo es FK a
 * `TipoProducto`, así que DRF devuelve su PK (número), no el `codigo` que
 * declara `Product`. `codigo` siempre llega poblado en este endpoint.
 */
export type ProductOnboardingResult = Omit<Product, "tipo" | "codigo"> & {
  tipo: ProductType["id"] | null;
  codigo: string;
};
