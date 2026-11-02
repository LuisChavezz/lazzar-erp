import type { PurchaseOrderOnboardingProducto } from "../interfaces/purchase-order-onboarding.interface";
import { lineKeyProducto, type PurchaseOrderLine } from "./purchaseOrderLines";

/**
 * Lógica pura del selector de productos de una OC de materia prima
 * (`PurchaseOrderProductLinesList`): qué filas se muestran al combinar el
 * catálogo cargado con la búsqueda en el servidor (EC-703), y qué marcados van
 * fijos arriba.
 */

/** ¿El renglón es un producto del catálogo que la lista puede marcar? */
export const isProductoLine = (line: PurchaseOrderLine) => line.key === lineKeyProducto(line.producto);

/**
 * Fila para un renglón por producto que no está en lo cargado (guardado en la
 * orden, o elegido de una búsqueda que ya cambió): lo que el renglón sabe.
 */
export const productFromLine = (line: PurchaseOrderLine): PurchaseOrderOnboardingProducto => ({
  id: line.producto,
  codigo: null,
  cod_proscai: "",
  nombre: line.descripcion || `Producto #${line.producto}`,
  descripcion: null,
  precio_base: Number(line.precioInicial) || 0,
});

/**
 * Las coincidencias del catálogo cargado y, después, las del servidor que no
 * estén ya entre ellas. El catálogo son los primeros por nombre, así que el
 * orden se conserva.
 */
export const mergeProductMatches = (
  localMatches: PurchaseOrderOnboardingProducto[],
  serverMatches: PurchaseOrderOnboardingProducto[],
): PurchaseOrderOnboardingProducto[] => {
  const localIds = new Set(localMatches.map((p) => p.id));
  return [...localMatches, ...serverMatches.filter((p) => !localIds.has(p.id))];
};

/** Datos de un producto marcado: los ya conocidos o, si no, los de su renglón. */
const productForLine = (line: PurchaseOrderLine, knownById: Map<number, PurchaseOrderOnboardingProducto>) =>
  knownById.get(line.producto) ?? productFromLine(line);

/**
 * Las filas a mostrar: arriba, FIJOS, los productos marcados que `matches` dejó
 * fuera (para que "Crear"/"Guardar" nunca envíe algo que el usuario no ve), y
 * luego `matches`. Los renglones que no son un producto de la lista (`v:`,
 * `d:`) no entran: el selector los fija aparte.
 */
export const pinSelectedProducts = (
  matches: PurchaseOrderOnboardingProducto[],
  selectedLines: PurchaseOrderLine[],
  knownById: Map<number, PurchaseOrderOnboardingProducto>,
): PurchaseOrderOnboardingProducto[] => {
  const visibleIds = new Set(matches.map((p) => p.id));
  const pinned = selectedLines
    .filter((l) => isProductoLine(l) && !visibleIds.has(l.producto))
    .map((l) => productForLine(l, knownById));
  return [...pinned, ...matches];
};

/**
 * Lo que congela "Ver solo estos": los marcados del catálogo en su orden y,
 * después, los elegidos en la búsqueda del servidor, que no están en
 * `products`.
 */
export const snapshotSelectedProducts = (
  products: PurchaseOrderOnboardingProducto[],
  selectedLines: PurchaseOrderLine[],
  knownById: Map<number, PurchaseOrderOnboardingProducto>,
): PurchaseOrderOnboardingProducto[] => {
  const selectedIds = new Set(selectedLines.filter(isProductoLine).map((l) => l.producto));
  const productIds = new Set(products.map((p) => p.id));
  return [
    ...products.filter((p) => selectedIds.has(p.id)),
    ...selectedLines
      .filter((l) => isProductoLine(l) && !productIds.has(l.producto))
      .map((l) => productForLine(l, knownById)),
  ];
};
