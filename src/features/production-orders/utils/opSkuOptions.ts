import type { ProductVariantSelectorItem } from "@/src/features/product-variants/interfaces/product-variant-selector.interface";
import type { ProductionVariantOption } from "../interfaces/production-order.interface";

/**
 * SKU elegible en el onboarding de OP: una variante de catálogo o una variante
 * de producción (muestra sin alta en catálogo). `key` las distingue porque los
 * ids de las dos tablas pueden coincidir.
 */
export interface OpSkuOption {
  key: string;
  kind: "catalogo" | "produccion";
  id: number;
  nombre: string;
  sku: string;
  /** Solo catálogo: fila del selector, para los badges de códigos. */
  variant?: ProductVariantSelectorItem;
  /** Solo producción: pedido de la muestra. */
  pedidoFolio?: string | null;
  tieneBom: boolean;
}

/** `tieneBom` sale de la marca `tiene_bom` del selector de variantes (EC-886). */
export const catalogOption = (variant: ProductVariantSelectorItem): OpSkuOption => ({
  key: `c:${variant.id}`,
  kind: "catalogo",
  id: variant.id,
  nombre: variant.nombre,
  sku: variant.sku,
  variant,
  tieneBom: variant.tiene_bom,
});

export const productionOption = (variant: ProductionVariantOption): OpSkuOption => ({
  key: `p:${variant.id}`,
  kind: "produccion",
  id: variant.id,
  nombre: variant.nombre,
  sku: variant.sku,
  pedidoFolio: variant.pedido_folio,
  tieneBom: variant.tiene_bom,
});

/**
 * Búsqueda EN MEMORIA de una muestra sin catálogo (`kind: "produccion"`): por
 * nombre, SKU y folio del pedido, sin distinguir mayúsculas; un término vacío
 * casa todo. Las variantes de catálogo no pasan por aquí: las busca el servidor.
 */
export const matchesProductionOption = (option: OpSkuOption, term: string) => {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  return [option.nombre, option.sku, option.pedidoFolio ?? ""].some((value) =>
    value.toLowerCase().includes(query),
  );
};
