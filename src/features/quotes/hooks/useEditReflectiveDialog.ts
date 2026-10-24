'use client';

/**
 * useEditReflectiveDialog.ts
 *
 * Hook contenedor para el diálogo de edición de reflejantes de una partida
 * específica de la cotización.
 *
 * Responsabilidades:
 * - Encapsula `useReflectiveState` inicializado con el item actual.
 * - Activa automáticamente `hasReflective` al montar, ya que el propósito
 *   exclusivo del diálogo es configurar reflejantes.
 * - Provee `handleSave` que valida, construye el payload y actualiza el item.
 * - Provee `handleRemoveReflective` para eliminar toda la configuración.
 * - Expone `reflectiveStepProps` listos para pasar a `<StepReflective />`.
 *
 * Patrón: Container Hook.
 */

import { useCallback, useEffect, useMemo } from 'react';
import type { QuoteItem } from '../types';
import { useReflectiveState } from './useReflectiveState';
import { buildLocationRule, type AllowedCodes } from '../utils/processCompatibility';
import {
  exceedsReflectiveInventoryCap,
  linePieces,
  REFLEJANTE_INVENTARIO_MESSAGE,
} from '../utils/reflectiveInventoryCap';

export interface UseEditReflectiveDialogOptions {
  /** Item actual de la partida a editar. */
  item: QuoteItem | null;
  /** Callback invocado al cerrar el diálogo (abierto → cerrado). */
  onOpenChange: (open: boolean) => void;
  /**
   * Posiciones de reflejante que admite la categoría de la partida (matriz
   * prenda/proceso, CO-05). `null` = sin restricción.
   */
  allowedPositions?: AllowedCodes;
}

/**
 * `useEditReflectiveDialog`
 * Hook que orquesta el estado del diálogo de edición de reflejantes.
 */
export function useEditReflectiveDialog({
  item,
  onOpenChange,
  allowedPositions = null,
}: UseEditReflectiveDialogOptions) {
  const positionRule = useMemo(
    () => buildLocationRule('reflejante', allowedPositions, 'partida'),
    [allowedPositions]
  );
  // El `key` del componente EditReflectiveDialog cambia con el índice del item,
  // forzando el remount y la reinicialización limpia de useReflectiveState.
  const reflectiveState = useReflectiveState(item, positionRule);

  // Activa reflejante automáticamente al montar: el diálogo solo existe para
  // configurar reflejantes, independientemente del estado previo del item.
  // buildPayload() y validation requieren hasReflective=true para operar.
  useEffect(() => {
    reflectiveState.setHasReflective(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflejante «Del inventario»: máximo 50 piezas por partida (CO-06), contra
  // las piezas actuales de la partida.
  const inventoryCapError =
    item && exceedsReflectiveInventoryCap(reflectiveState.buildPayload(), linePieces(item))
      ? REFLEJANTE_INVENTARIO_MESSAGE
      : null;

  /**
   * Valida la configuración de reflejante y, si es válida, construye el
   * payload y notifica al padre para que actualice el item.
   */
  const handleSave = useCallback(
    (onSave: (updatedItem: QuoteItem) => void) => {
      if (!item) return;

      // Marcar intento de submit para mostrar errores en StepReflective.
      reflectiveState.setSubmitAttempted(true);

      if (reflectiveState.validation.hasError || inventoryCapError) return;

      const reflejantes = reflectiveState.buildPayload();
      onSave({ ...item, reflejantes: reflejantes ?? item.reflejantes });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item, reflectiveState.validation.hasError, inventoryCapError]
  );

  /**
   * Cierra el diálogo. El reset del estado ocurre automáticamente en el
   * siguiente remount via `key` en QuoteForm.
   */
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  /**
   * Elimina toda la configuración de reflejante del item y cierra el diálogo.
   * Persiste `activo: false` con especificaciones vacías.
   */
  const handleRemoveReflective = useCallback(
    (onSave: (updatedItem: QuoteItem) => void) => {
      if (!item) return;
      onSave({ ...item, reflejantes: { activo: false, especificaciones: [] } });
      onOpenChange(false);
    },
    [item, onOpenChange]
  );

  /** Props listos para pasar directamente a `<StepReflective />`. */
  const reflectiveStepProps = useMemo(
    () => ({
      configs: reflectiveState.configs,
      onAddConfig: reflectiveState.addConfig,
      onRemoveConfig: reflectiveState.removeConfig,
      onUpdateConfig: reflectiveState.updateConfig,
      errorsByConfig: reflectiveState.validation.errorsByConfig,
      generalError: inventoryCapError,
      scrollToConfigId: reflectiveState.validation.firstErrorConfigId,
      showValidationErrors: reflectiveState.submitAttempted,
      observaciones: reflectiveState.observaciones,
      onObservacionesChange: reflectiveState.setObservaciones,
      positionRule,
    }),
    [
      positionRule,
      reflectiveState.configs,
      reflectiveState.addConfig,
      reflectiveState.removeConfig,
      reflectiveState.updateConfig,
      reflectiveState.validation.errorsByConfig,
      reflectiveState.validation.firstErrorConfigId,
      inventoryCapError,
      reflectiveState.submitAttempted,
      reflectiveState.observaciones,
      reflectiveState.setObservaciones,
    ]
  );

  return {
    reflectiveStepProps,
    hasReflective: reflectiveState.hasReflective,
    setHasReflective: reflectiveState.setHasReflective,
    handleSave,
    handleOpenChange,
    handleRemoveReflective,
  };
}
