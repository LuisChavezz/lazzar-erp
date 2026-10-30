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
 */
export type PurchaseOrderLineKey = `p:${number}` | `v:${number}`;

export const lineKeyProducto = (productoId: number): PurchaseOrderLineKey => `p:${productoId}`;
export const lineKeyVariante = (varianteId: number): PurchaseOrderLineKey => `v:${varianteId}`;

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
  descripcion: v.producto_nombre,
  precioInicial: formatPrecioBase(v.precio_base),
});

/**
 * Renglón guardado de la orden, para sembrar la edición. Conserva su variante
 * si la tiene: el PUT reemplaza TODOS los renglones, así que uno que se
 * reenviara solo con `producto` perdería su SKU en silencio.
 *
 * `precio` puede faltar si el backend filtró importes por rol; la edición se
 * bloquea antes en ese caso y el `?? ""` queda como salvaguarda de tipos.
 */
export const lineFromDetalle = (d: PurchaseOrderDetalle): PurchaseOrderLine => ({
  key: d.producto_variante_id !== null ? lineKeyVariante(d.producto_variante_id) : lineKeyProducto(d.producto_id),
  producto: d.producto_id,
  productoVariante: d.producto_variante_id,
  sku: d.producto_variante_sku,
  nombre: d.producto_nombre || d.descripcion || `Producto #${d.producto_id}`,
  atributos: null,
  descripcion: d.descripcion,
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
 * Renglones guardados de la orden con su cantidad, uno por llave. Si la orden
 * repite un producto (o una variante) en dos renglones, queda uno solo, con
 * los datos del último: lo mismo que hacía la edición cuando indexaba por id
 * de producto.
 */
export const seedFromDetalles = (
  detalles: PurchaseOrderDetalle[],
): { line: PurchaseOrderLine; cantidad: number }[] => {
  const byKey = new Map<PurchaseOrderLineKey, { line: PurchaseOrderLine; cantidad: number }>();
  detalles.forEach((d) => {
    const line = lineFromDetalle(d);
    byKey.set(line.key, { line, cantidad: d.cantidad });
  });
  return [...byKey.values()];
};
