import type { ProductVariant } from "@/src/features/product-variants/interfaces/product-variant.interface";
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
  /** Solo catálogo: para los badges de códigos. */
  variant?: ProductVariant;
  /** Solo producción: pedido de la muestra. */
  pedidoFolio?: string | null;
  tieneBom: boolean;
}

export const catalogOption = (variant: ProductVariant, tieneBom: boolean): OpSkuOption => ({
  key: `c:${variant.id}`,
  kind: "catalogo",
  id: variant.id,
  nombre: variant.nombre,
  sku: variant.sku,
  variant,
  tieneBom,
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

/** Búsqueda por nombre, SKU, códigos y folio del pedido (término ya en minúsculas). */
export const matchesOpSkuOption = (option: OpSkuOption, term: string, matchesVariant: (v: ProductVariant, t: string) => boolean) =>
  option.variant
    ? matchesVariant(option.variant, term)
    : [option.nombre, option.sku, option.pedidoFolio ?? ""].some((value) => value.toLowerCase().includes(term));
