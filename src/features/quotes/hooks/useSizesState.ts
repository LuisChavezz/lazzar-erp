/**
 * useSizesState.ts
 * Hook responsable de manejar las cantidades por talla para los productos
 * seleccionados en el diálogo. Mantiene un mapa: productId => { sizeId => cantidad }.
 * - `updateSizeQuantity` normaliza y asigna cantidades.
 * - `validateSelectedRows` verifica que cada producto tenga al menos una talla > 0.
 * - `getItemSizes` construye la lista de tallas para envío en el payload.
 */
import { useCallback, useState } from "react";
import type { Size } from "../../sizes/interfaces/size.interface";
import type { CatalogRow, QuoteItem } from "../types";

/**
 * buildInitialSizeMap
 * Construye el mapa inicial de cantidades por talla a partir de un `QuoteItem`.
 */
const buildInitialSizeMap = (
  item?: QuoteItem | null
): Record<number, Record<number, number>> => {
  if (!item?.productoId || !item.tallas) return {};

  const map: Record<number, number> = {};
  item.tallas.forEach((talla) => {
    map[talla.tallaId] = Math.max(0, Math.floor(Number(talla.cantidad) || 0));
  });

  return { [item.productoId]: map };
};

export interface UseSizesStateParams {
  initialItem?: QuoteItem | null;
}
/**
 * useSizesState
 * Provee el estado y operaciones para manejar tallas y cantidades por producto.
 * Retorna:
 * - `sizeQuantitiesPerProduct`: mapa de cantidades.
 * - `sizeErrors`: errores por producto.
 * - `updateSizeQuantity`, `validateSelectedRows`, `getItemSizes`, `reset`.
 */
export function useSizesState({ initialItem }: UseSizesStateParams) {
  const [sizeQuantitiesPerProduct, setSizeQuantitiesPerProduct] = useState<
    Record<number, Record<number, number>>
  >(() => buildInitialSizeMap(initialItem));
  const [sizeErrors, setSizeErrors] = useState<Record<number, string>>({});

  const updateSizeQuantity = useCallback(
    (productId: number, sizeId: number, value: number) => {
      const normalized = Number.isFinite(value)
        ? Math.max(0, Math.floor(value))
        : 0;

      setSizeQuantitiesPerProduct((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] ?? {}),
          [sizeId]: normalized,
        },
      }));

      setSizeErrors((prev) => {
        if (!prev[productId]) return prev;
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    },
    []
  );

  const validateSelectedRows = useCallback((selectedRows: CatalogRow[]) => {
    let hasSizeErrors = false;
    const nextErrors: Record<number, string> = {};

    for (const row of selectedRows) {
      const quantities = sizeQuantitiesPerProduct[row.id] ?? {};
      const total = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
      if (total <= 0) {
        nextErrors[row.id] = "Sin tallas";
        hasSizeErrors = true;
      }
    }

    setSizeErrors(nextErrors);
    return !hasSizeErrors;
  }, [sizeQuantitiesPerProduct]);

  const getItemSizes = useCallback((productId: number, sizes: Size[]) => {
    const quantities = sizeQuantitiesPerProduct[productId] ?? {};
    return sizes
      .map((size) => ({ ...size, cantidad: quantities[size.id] ?? 0 }))
      .filter((size) => size.cantidad > 0);
  }, [sizeQuantitiesPerProduct]);

  const reset = useCallback((item?: QuoteItem | null) => {
    setSizeQuantitiesPerProduct(buildInitialSizeMap(item));
    setSizeErrors({});
  }, []);

  return {
    sizeQuantitiesPerProduct,
    sizeErrors,
    updateSizeQuantity,
    validateSelectedRows,
    getItemSizes,
    reset,
  };
}
