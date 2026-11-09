"use client";

import type { ReactNode } from "react";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";

interface StampConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** ¿Hay un timbrado en vuelo? (el `isStamping` del hook de timbrado). Solo pinta. */
  isStamping: boolean;
  /**
   * Lectura SÍNCRONA del candado del timbrado (el `isIdle` del hook, sobre la
   * caché de mutaciones): es la que decide si el diálogo puede cerrarse.
   */
  isIdle: () => boolean;
  /** Dispara el timbrado; el llamador cierra el diálogo al terminar. */
  onConfirm: () => void;
  /** Texto del botón de confirmar. Por defecto "Timbrar". */
  confirmText?: string;
  /** Texto del botón mientras la petición está en vuelo. Por defecto "Timbrando…". */
  busyText?: string;
  /** Color del botón de confirmar. Por defecto "blue" (timbrar); "red" para una cancelación. */
  confirmColor?: "blue" | "red";
  /** Contenido extra entre la descripción y los botones (ver `ConfirmDialog`). */
  children?: ReactNode;
  /** Deshabilita Confirmar, p. ej. mientras falta un dato de `children`. */
  confirmDisabled?: boolean;
}

/**
 * Confirmación del TIMBRADO de un CFDI (facturas, notas de crédito), un acto
 * fiscal irreversible. También la usa "Conciliar con Facturama" (EC-709), con
 * su propio `confirmText`/`busyText`: el mismo cierre guardado por `isIdle()`.
 * Y "Cancelar CFDI ante el SAT" (EC-764), con `confirmColor="red"` y el
 * selector del motivo SAT en `children` (EC-808).
 *
 * Mientras la petición está en vuelo no se puede cerrar ni reenviar: Confirmar
 * y Volver quedan deshabilitados (`busy`) y Esc y el clic fuera se ignoran. El
 * cierre lo decide `isIdle()`, que lee la caché de mutaciones de forma
 * síncrona: vale desde el mismo clic de confirmar, antes del render que pinta
 * `isStamping`. El doble envío lo corta además el candado por registro del
 * hook.
 *
 * El llamador lo cierra al TERMINAR, con cualquier resultado: el toast dice
 * qué pasó y, si falló, el botón sigue en su lugar. No queda abierto para
 * reintentar de inmediato porque una falla de red o un timeout de Facturama
 * puede haber timbrado de todos modos; el refetch muestra el estado real.
 */
export function StampConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  isStamping,
  isIdle,
  onConfirm,
  confirmText = "Timbrar",
  busyText = "Timbrando…",
  confirmColor = "blue",
  children,
  confirmDisabled = false,
}: StampConfirmDialogProps) {
  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado debe verse.
    if (!next && !isIdle()) return;
    onOpenChange(next);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      confirmText={isStamping ? busyText : confirmText}
      cancelText="Volver"
      confirmColor={confirmColor}
      closeOnConfirm={false}
      busy={isStamping}
      confirmDisabled={confirmDisabled}
      onConfirm={onConfirm}
    >
      {children}
    </ConfirmDialog>
  );
}
