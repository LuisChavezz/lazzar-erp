"use client";

import type { ComponentProps } from "react";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";

interface CobroActionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Texto del botón de confirmar en reposo. */
  confirmText: string;
  /** Texto del botón de confirmar mientras la acción está en vuelo. */
  busyText: string;
  confirmColor: ComponentProps<typeof ConfirmDialog>["confirmColor"];
  /**
   * Disparador de la acción (`trigger` de `useCobroAction`), o `null` sin cobro
   * objetivo: confirmar entonces no hace nada.
   */
  run: ((options: { onSettled?: () => void }) => void) | null;
  /** La acción de ESTE cobro está en vuelo (`isRunning` de `useCobroAction`). */
  isRunning: boolean;
}

/**
 * Confirmación de una acción irreversible sobre UN cobro (timbrar el REP,
 * cancelar el REP, cancelar el cobro). Cada diálogo conserva su copia del
 * cobro (`useDialogSession`), su hook y su texto; aquí vive solo el ciclo de
 * cierre que comparten:
 *
 * - Mientras la acción está en vuelo (`busy`) no se puede cerrar ni reenviar.
 * - Se cierra al TERMINAR, con cualquier resultado: el toast dice qué pasó. No
 *   queda abierto para reintentar.
 */
export function CobroActionConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  busyText,
  confirmColor,
  run,
  isRunning,
}: CobroActionConfirmDialogProps) {
  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado debe verse.
    if (!next && isRunning) return;
    onOpenChange(next);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      confirmText={isRunning ? busyText : confirmText}
      cancelText="Volver"
      confirmColor={confirmColor}
      closeOnConfirm={false}
      busy={isRunning}
      onConfirm={() => {
        if (!run) return;
        // Cierre directo, sin pasar por `handleOpenChange`: al terminar, el
        // `isRunning` capturado en este render todavía no se actualizó.
        run({ onSettled: () => onOpenChange(false) });
      }}
    />
  );
}
