'use client';

/**
 * useEditSizesDialog.ts
 *
 * Hook contenedor para el diálogo de edición de tallas de una partida
 * específica de la cotización.
 *
 * Responsabilidades:
 * - Encapsula `useSizesState` inicializado con el item actual.
 * - Construye el `CatalogRow` necesario para `StepSizes` a partir del item.
 * - Auto-expande el producto único al montar (el diálogo siempre edita un solo producto).
 * - Provee `handleSave` que valida (al menos una talla con cantidad > 0),
 *   construye el payload y actualiza el item con las nuevas tallas y la cantidad total.
 * - A diferencia de bordados y reflejantes, NO existe opción de quitar tallas:
 *   siempre debe quedar al menos una con cantidad > 0.
 * - Expone `sizesStepProps` listos para pasar a `<StepSizes />`.
 *
 * Patrón: Container Hook (idéntico a `useEditEmbroideryDialog` y
 * `useEditReflectiveDialog`). La clave `key` en QuoteForm fuerza el remount
 * al cambiar de partida, garantizando estado limpio sin reset manual.
 */

import { useCallback, useMemo, useState } from 'react';
import type { Size } from '../../sizes/interfaces/size.interface';
import type { CatalogRow, QuoteItem } from '../types';
import { useSizesState } from './useSizesState';

export interface UseEditSizesDialogOptions {
  /** Partida cuyas tallas se van a editar. */
  item: QuoteItem | null;
  /** Catálogo completo de tallas disponibles. */
  sizes: Size[];
  /** Callback de apertura/cierre del diálogo. */
  onOpenChange: (open: boolean) => void;
}

/**
 * `useEditSizesDialog`
 * Hook que orquesta el estado del diálogo de edición de tallas.
 */
export function useEditSizesDialog({
  item,
  sizes,
  onOpenChange,
}: UseEditSizesDialogOptions) {
  // El `key` del componente EditSizesDialog cambia con el índice del item,
  // forzando el remount y la reinicialización limpia de useSizesState.
  const sizesState = useSizesState({ initialItem: item });

  // Auto-expande el producto único al montar: el diálogo edita un solo
  // producto y siempre debe mostrarse expandido para facilitar la edición.
  const [openProductId, setOpenProductId] = useState<number | null>(
    item?.productoId ?? null
  );

  /**
   * Construye el `CatalogRow` requerido por `StepSizes` a partir del item.
   * `id` debe igualar `item.productoId` ya que es la clave usada en
   * `sizeQuantitiesPerProduct` por `useSizesState`.
   */
  const selectedRow = useMemo<CatalogRow | null>(() => {
    if (!item) return null;
    return {
      id: item.productoId,
      productoId: item.productoId,
      nombre: item.descripcion,
      descripcion: item.descripcion,
      unidad: item.unidad ?? '',
      precio: item.precio,
      isActive: true,
    };
  }, [item]);

  /**
   * Valida que exista al menos una talla con cantidad > 0 y, si es válida,
   * construye el payload y notifica al padre.
   * Actualiza `cantidad` con la suma total de piezas entre todas las tallas.
   */
  const handleSave = useCallback(
    (onSave: (updatedItem: QuoteItem) => void) => {
      if (!item || !selectedRow) return;

      // validateSelectedRows marca errores en sizeErrors y devuelve false
      // si algún producto no tiene al menos una talla > 0.
      const isValid = sizesState.validateSelectedRows([selectedRow]);
      if (!isValid) return;

      const updatedSizes = sizesState.getItemSizes(item.productoId, sizes);
      const tallas = updatedSizes.map((size) => ({
        tallaId: size.id,
        nombre: size.nombre,
        cantidad: size.cantidad,
      }));
      // Recalcular cantidad total para mantener coherencia con el sumatorio de tallas.
      const totalCantidad = tallas.reduce((sum, t) => sum + t.cantidad, 0);

      onSave({ ...item, tallas, cantidad: totalCantidad });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item, sizes, sizesState.validateSelectedRows, sizesState.getItemSizes, selectedRow]
  );

  /**
   * Cierra el diálogo. El reset del estado ocurre en el siguiente remount
   * via `key` en QuoteForm.
   */
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  /** Alterna la expansión del acordeón de producto en StepSizes. */
  const handleToggleProduct = useCallback((id: number) => {
    setOpenProductId((prev) => (prev === id ? null : id));
  }, []);

  /** Props listos para pasar directamente a `<StepSizes />`. */
  const sizesStepProps = useMemo(
    () => ({
      selectedRows: selectedRow ? [selectedRow] : [],
      sizes,
      sizeQuantitiesPerProduct: sizesState.sizeQuantitiesPerProduct,
      updateSizeQuantity: sizesState.updateSizeQuantity,
      openProductId,
      onToggleProduct: handleToggleProduct,
      sizeErrors: sizesState.sizeErrors,
    }),
    [
      selectedRow,
      sizes,
      sizesState.sizeQuantitiesPerProduct,
      sizesState.updateSizeQuantity,
      openProductId,
      handleToggleProduct,
      sizesState.sizeErrors,
    ]
  );

  return {
    sizesStepProps,
    handleSave,
    handleOpenChange,
  };
}
