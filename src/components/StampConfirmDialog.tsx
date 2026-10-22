"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";

interface StampConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** ¿Hay un timbrado en vuelo? (el `isStamping` del hook de timbrado). */
  isStamping: boolean;
  /** Dispara el timbrado; el llamador cierra el diálogo al terminar. */
  onConfirm: () => void;
}

/**
 * Confirmación del TIMBRADO de un CFDI (facturas, notas de crédito), un acto
 * fiscal irreversible.
 *
 * Mientras la petición está en vuelo (`busy`) no se puede cerrar ni reenviar:
 * Confirmar y Volver quedan deshabilitados y Esc y el clic fuera se ignoran.
 * El doble envío lo corta además el candado por registro del hook.
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
  onConfirm,
}: StampConfirmDialogProps) {
  const handleOpenChange = (next: boolean) => {
    // No se cierra a media petición: el resultado debe verse.
    if (!next && isStamping) return;
    onOpenChange(next);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      confirmText={isStamping ? "Timbrando…" : "Timbrar"}
      cancelText="Volver"
      confirmColor="blue"
      closeOnConfirm={false}
      busy={isStamping}
      onConfirm={onConfirm}
    />
  );
}
