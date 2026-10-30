import type {
  PurchaseOrderOnboardingProducto,
  PurchaseOrderOnboardingVariante,
} from "../interfaces/purchase-order-onboarding.interface";
import type { PurchaseOrderDetalle } from "../interfaces/purchase-order.interface";

/**
 * Llave de un renglón en el Step 2 de alta/edición de OC: `p:<id de producto>`
 * para materia prima y para los renglones de PT anteriores a la compra por SKU,
 * `v:<id de variante>` para los de PT capturados por SKU (EC-657).
 *
 * La llave es la identidad de lo que se compra, no del producto: dos tallas del
 * mismo producto son dos variantes y nunca chocan, y un renglón "Sin SKU" de un
 * producto convive con renglones por SKU de ese mismo producto. Los prefijos
 * evitan que un id de producto y uno de variante coincidan.
 *
 * `d:<id del renglón guardado>` es para la edición de una orden que REPITE un
 * producto o una variante en varios renglones: cada uno conserva su propia
 * llave (el PK del renglón en la foto de la orden), así que el PUT, que
 * reemplaza todos los renglones, devuelve los mismos. Esos renglones solo se
 * quitan desde su propia fila fija; marcar el producto o la variante en la
 * lista o el buscador agrega uno nuevo (`p:`/`v:`) sin tocarlos.
 */
export type PurchaseOrderLineKey = `p:${number}` | `v:${number}` | `d:${number}`;

export const lineKeyProducto = (productoId: number): PurchaseOrderLineKey => `p:${productoId}`;
export const lineKeyVariante = (varianteId: number): PurchaseOrderLineKey => `v:${varianteId}`;
export const lineKeyRenglon = (detalleId: number): PurchaseOrderLineKey => `d:${detalleId}`;

/** Tope de `OrdenCompraDetalle.descripcion` en el backend (`max_length=200`). */
const DESCRIPCION_MAX = 200;

/** Lo que el Step 2 necesita de un renglón para pintarlo y para enviarlo. */
export interface PurchaseOrderLine {
  key: PurchaseOrderLineKey;
  /** Producto del catálogo (en una variante, el suyo). */
  producto: number;
  /** Variante comprada; `null` en materia prima y en renglones "Sin SKU". */
  productoVariante: number | null;
  sku: string | null;
  /** Nombre del producto a mostrar. */
  nombre: string;
  /**
   * "Color · Talla": solo en variantes elegidas del buscador, porque la lectura
   * de la orden no los trae (los renglones guardados muestran SKU · producto).
   */
  atributos: string | null;
  /** Texto que viaja como `descripcion` del renglón. */
  descripcion: string;
  /** Precio con el que se siembra el renglón al marcarlo. */
  precioInicial: string;
}

const formatPrecioBase = (precioBase: number | string | null | undefined) =>
  (Number(precioBase) || 0).toFixed(2);

export const lineFromProducto = (p: PurchaseOrderOnboardingProducto): PurchaseOrderLine => ({
  key: lineKeyProducto(p.id),
  producto: p.id,
  productoVariante: null,
  sku: null,
  nombre: p.nombre,
  atributos: null,
  descripcion: p.nombre,
  precioInicial: formatPrecioBase(p.precio_base),
});

export const lineFromVariante = (v: PurchaseOrderOnboardingVariante): PurchaseOrderLine => ({
  key: lineKeyVariante(v.id),
  producto: v.producto_id,
  productoVariante: v.id,
  sku: v.sku,
  nombre: v.producto_nombre,
  atributos: [v.color, v.talla].filter(Boolean).join(" · ") || null,
  // "Producto · Color · Talla": dos tallas del mismo producto no deben salir
  // como renglones idénticos en el PDF y el correo, que listan por descripción.
  descripcion: [v.producto_nombre, v.color, v.talla]
    .filter(Boolean)
    .join(" · ")
    .slice(0, DESCRIPCION_MAX),
  precioInicial: formatPrecioBase(v.precio_base),
});

/**
 * Renglón guardado de la orden, para sembrar la edición. Conserva su variante
 * si la tiene: el PUT reemplaza TODOS los renglones, así que uno que se
 * reenviara solo con `producto` perdería su SKU en silencio.
 *
 * `descripcion` es `null=True` en el backend: un renglón guardado sin ella se
 * reenvía con el nombre del producto del catálogo, como hacía la edición antes
 * de EC-657 (`?? nombre`; un `""` guardado se respeta).
 *
 * `precio` puede faltar si el backend filtró importes por rol; la edición se
 * bloquea antes en ese caso y el `?? ""` queda como salvaguarda de tipos.
 */
export const lineKeyFromDetalle = (d: PurchaseOrderDetalle): PurchaseOrderLineKey =>
  d.producto_variante_id !== null ? lineKeyVariante(d.producto_variante_id) : lineKeyProducto(d.producto_id);

export const lineFromDetalle = (
  d: PurchaseOrderDetalle,
  key: PurchaseOrderLineKey = lineKeyFromDetalle(d),
): PurchaseOrderLine => ({
  key,
  producto: d.producto_id,
  productoVariante: d.producto_variante_id,
  sku: d.producto_variante_sku,
  nombre: d.producto_nombre || d.descripcion || `Producto #${d.producto_id}`,
  atributos: null,
  descripcion: d.descripcion ?? d.producto_nombre ?? "",
  precioInicial: d.precio ?? "",
});

/**
 * ¿Algún renglón se compró por SKU? Decide si el detalle, el PDF y el correo
 * de la OC muestran la columna SKU: sin ninguno (materia prima, PT anterior a
 * la compra por SKU) no se pinta una columna vacía.
 */
export const hasVariantSku = (
  detalles: { producto_variante_sku?: string | null }[],
): boolean => detalles.some((d) => Boolean(d.producto_variante_sku));

/**
 * Renglones guardados de la orden con su cantidad, TODOS y en su orden. El
 * producto o la variante que aparece en un solo renglón conserva su llave
 * `p:`/`v:` (la lista y el buscador lo marcan y desmarcan como siempre); el que
 * se repite pasa a `d:<id>` en cada uno de sus renglones, para que ninguno se
 * pierda al guardar (ver {@link PurchaseOrderLineKey}).
 */
export const seedFromDetalles = (
  detalles: PurchaseOrderDetalle[],
): { line: PurchaseOrderLine; cantidad: number }[] => {
  const repeticiones = new Map<PurchaseOrderLineKey, number>();
  detalles.forEach((d) => {
    const key = lineKeyFromDetalle(d);
    repeticiones.set(key, (repeticiones.get(key) ?? 0) + 1);
  });
  return detalles.map((d) => {
    const key = lineKeyFromDetalle(d);
    return {
      line: lineFromDetalle(d, (repeticiones.get(key) ?? 0) > 1 ? lineKeyRenglon(d.id) : key),
      cantidad: d.cantidad,
    };
  });
};
