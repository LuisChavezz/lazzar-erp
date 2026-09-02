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
import { MUESTRA_ROW_ID } from "../types";
import type { CatalogRow, QuoteItem } from "../types";

/**
 * buildInitialSizeMap
 * Construye el mapa inicial de cantidades por talla a partir de un `QuoteItem`.
 *
 * El mapa se indexa por `productoId`, que una partida de MUESTRA no tiene
 * (`null` por contrato). Para esas se usa la clave sintética `MUESTRA_ROW_ID`,
 * la misma que el diálogo de alta emplea para su fila sintética, de modo que
 * quien edite sus tallas pueda leer las cantidades ya capturadas.
 *
 * El cambio es ADITIVO: solo `productoId === null` toma la rama nueva. Un
 * `productoId` de catálogo (>= 1) recorre exactamente el camino de antes, y
 * `0`/`undefined` siguen devolviendo `{}` como siempre — `0` es el valor que
 * `mapDetalleToQuoteItem` da a una muestra rehidratada, un flujo aún diferido.
 */
const buildInitialSizeMap = (
  item?: QuoteItem | null
): Record<number, Record<number, number>> => {
  if (!item?.tallas) return {};

  // `=== null` y no `??`: `undefined` debe seguir cayendo en `{}` como siempre.
  const key = item.productoId === null ? MUESTRA_ROW_ID : item.productoId;
  if (!key) return {};

  const map: Record<number, number> = {};
  item.tallas.forEach((talla) => {
    map[talla.tallaId] = Math.max(0, Math.floor(Number(talla.cantidad) || 0));
  });

  return { [key]: map };
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

  const clearProductSizes = useCallback((productId: number) => {
    setSizeQuantitiesPerProduct((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setSizeErrors((prev) => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const validateSelectedRows = useCallback((
    selectedRows: CatalogRow[],
    availableSizesPerProduct?: Record<number, Size[]>
  ) => {
    let hasSizeErrors = false;
    const nextErrors: Record<number, string> = {};

    for (const row of selectedRows) {
      // Si no hay tallas disponibles para el producto, se omite la validación
      const availableSizes = availableSizesPerProduct?.[row.id];
      if (availableSizes !== undefined && availableSizes.length === 0) {
        continue;
      }
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
    clearProductSizes,
    validateSelectedRows,
    getItemSizes,
    reset,
  };
}
