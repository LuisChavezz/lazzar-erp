'use client';

/**
 * useEditEmbroideryDialog.ts
 *
 * Hook contenedor para el diálogo de edición de bordado de una partida
 * específica de la cotización.
 *
 * Responsabilidades:
 * - Encapsula `useEmbroideryState` inicializado con el item actual.
 * - Provee `handleSave` que valida, construye el payload y actualiza
 *   el item via callback.
 * - Expone `embroideryStepProps` listos para pasar a `StepEmbroidery`.
 * - Expone `handleOpenChange` que limpia el estado al cerrar.
 *
 * Patrón: Container Hook (similar a `useAddProductDialogState`).
 */

import { useCallback, useEffect, useMemo } from 'react';
import { POSITION_OPTIONS, type QuoteItem } from '../types';
import { useEmbroideryState } from './useEmbroideryState';

export interface UseEditEmbroideryDialogOptions {
  /** Item actual de la partida a editar. */
  item: QuoteItem | null;
  /** Callback invocado al cerrar el diálogo (abierto → cerrado). */
  onOpenChange: (open: boolean) => void;
}

/**
 * `useEditEmbroideryDialog`
 * Hook que orquesta el estado del diálogo de edición de bordado.
 */
export function useEditEmbroideryDialog({
  item,
  onOpenChange,
}: UseEditEmbroideryDialogOptions) {
  // El `key` del componente EditEmbroideryDialog cambia con el índice del item,
  // por lo que `useEmbroideryState` se reinicializa automáticamente en cada
  // apertura con un item diferente (remount por key).
  const embroideryState = useEmbroideryState(item);

  // Activar bordado automáticamente al montar el diálogo: su único propósito
  // es configurar especificaciones de bordado, independientemente de si el
  // item ya tenía bordado activo. buildPayload() requiere hasEmbroidery=true
  // para construir el payload; validateEmbroidery() lo requiere para validar.
  useEffect(() => {
    embroideryState.setHasEmbroidery(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Mapa estático de código→nombre de posición para el StepEmbroidery. */
  const positionMap = useMemo(
    () => new Map(POSITION_OPTIONS.map((p) => [p.codigo, p.nombre])),
    []
  );

  /**
   * Valida la configuración de bordado y, si es válida, construye el payload
   * y notifica al padre para que actualice el item.
   */
  const handleSave = useCallback(
    (onSave: (updatedItem: QuoteItem) => void) => {
      if (!item) return;

      const isValid = embroideryState.validateEmbroidery();
      if (!isValid) return;

      const bordados = embroideryState.buildPayload();
      onSave({ ...item, bordados: bordados ?? item.bordados });
    },
    [embroideryState, item]
  );

  /**
   * Cierra el diálogo. El reset del estado ocurre al remontar el componente
   * (via `key` en QuoteForm) — no se necesita reset explícito aquí.
   */
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  /**
   * Elimina toda la configuración de bordado del item y cierra el diálogo.
   * Persiste `activo: false` con especificaciones vacías en el item.
   */
  const handleRemoveEmbroidery = useCallback(
    (onSave: (updatedItem: QuoteItem) => void) => {
      if (!item) return;
      onSave({ ...item, bordados: { activo: false, especificaciones: [] } });
      onOpenChange(false);
    },
    [item, onOpenChange]
  );

  /** Props listos para pasar directamente a `<StepEmbroidery />`. */
  const embroideryStepProps = useMemo(
    () => ({
      embroideryObservaciones: embroideryState.embroideryObservaciones,
      onObservacionesChange: embroideryState.setEmbroideryObservaciones,
      embroiderySpecs: embroideryState.embroiderySpecs,
      onAddSpec: embroideryState.addEmbroiderySpec,
      onRemoveSpec: embroideryState.removeEmbroiderySpec,
      onUpdateSpec: embroideryState.updateEmbroiderySpec,
      onToggleSpecBoolean: embroideryState.toggleEmbroiderySpecBoolean,
      embroideryError: embroideryState.embroideryError,
      specErrors: embroideryState.specErrors,
      positionOptions: POSITION_OPTIONS,
      positionMap,
    }),
    [
      embroideryState.embroideryObservaciones,
      embroideryState.setEmbroideryObservaciones,
      embroideryState.embroiderySpecs,
      embroideryState.addEmbroiderySpec,
      embroideryState.removeEmbroiderySpec,
      embroideryState.updateEmbroiderySpec,
      embroideryState.toggleEmbroiderySpecBoolean,
      embroideryState.embroideryError,
      embroideryState.specErrors,
      positionMap,
    ]
  );

  return {
    embroideryStepProps,
    hasEmbroidery: embroideryState.hasEmbroidery,
    setHasEmbroidery: embroideryState.setHasEmbroidery,
    handleSave,
    handleOpenChange,
    handleRemoveEmbroidery,
  };
}
