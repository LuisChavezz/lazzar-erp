/**
 * useColorsState.ts
 * Hook para gestionar la selección de un color por producto dentro del flujo del diálogo.
 * - Mantiene el mapa de color seleccionado por producto (productId → colorId).
 * - Expone validación que verifica que todos los productos con colores disponibles
 *   tengan uno seleccionado.
 * - Soporta inicialización desde `initialItem` para el flujo de edición.
 */
import { useCallback, useState } from "react";
import type { Color } from "../../colors/interfaces/color.interface";
import type { CatalogRow, QuoteItem } from "../types";

export interface UseColorsStateResult {
  /** Mapa de productId → colorId seleccionado (null si no hay selección) */
  selectedColorPerProduct: Record<number, number | null>;
  /** Errores de validación indexados por productId */
  colorErrors: Record<number, string>;
  /** Selecciona un color para un producto y limpia su error */
  selectColor: (productId: number, colorId: number) => void;
  /** Valida que todos los productos con colores disponibles tengan uno seleccionado */
  validateColors: (
    selectedRows: CatalogRow[],
    productColorsById: Record<number, Color[]>,
  ) => boolean;
  /** Reinicia el estado a partir de un item opcional (para edición) */
  reset: (initialItem?: QuoteItem | null) => void;
}

/**
 * `useColorsState`
 * Gestiona la selección de un único color por producto en el paso de colores.
 * Puede inicializarse desde un `QuoteItem` existente para soportar flujos de edición.
 */
export function useColorsState(initialItem?: QuoteItem | null): UseColorsStateResult {
  const [selectedColorPerProduct, setSelectedColorPerProduct] = useState<
    Record<number, number | null>
  >(() => {
    if (initialItem?.productoId && initialItem?.colorId) {
      return { [initialItem.productoId]: initialItem.colorId };
    }
    return {};
  });

  const [colorErrors, setColorErrors] = useState<Record<number, string>>({});

  const selectColor = useCallback((productId: number, colorId: number) => {
    setSelectedColorPerProduct((prev) => ({ ...prev, [productId]: colorId }));
    setColorErrors((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const validateColors = useCallback(
    (selectedRows: CatalogRow[], productColorsById: Record<number, Color[]>) => {
      const errors: Record<number, string> = {};
      for (const row of selectedRows) {
        const colors = productColorsById[row.id] ?? [];
        // Solo se requiere selección si el producto tiene colores disponibles
        if (colors.length > 0 && !selectedColorPerProduct[row.id]) {
          errors[row.id] = "Selecciona un color";
        }
      }
      setColorErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [selectedColorPerProduct],
  );

  const reset = useCallback((nextInitialItem?: QuoteItem | null) => {
    if (nextInitialItem?.productoId && nextInitialItem?.colorId) {
      setSelectedColorPerProduct({ [nextInitialItem.productoId]: nextInitialItem.colorId });
    } else {
      setSelectedColorPerProduct({});
    }
    setColorErrors({});
  }, []);

  return {
    selectedColorPerProduct,
    colorErrors,
    selectColor,
    validateColors,
    reset,
  };
}
