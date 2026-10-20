"use client";

import { useState } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { Button } from "@/src/components/Button";

interface DocumentActionWithDialogProps {
  /** ¿Se ofrece la acción? Si no, no se pinta el botón. */
  offered: boolean;
  /**
   * Id de la nota visible que explica por qué la acción no está disponible.
   * Con él, el botón queda BLOQUEADO pero enfocable: `aria-disabled` (no
   * `disabled`, que lo sacaría del orden de tabulación y ocultaría la nota a
   * quien navega con teclado), descrito por esa nota y sin efecto al hacer
   * clic o pulsar Enter.
   */
  blockedNoteId?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  className?: string;
  /** El diálogo de la acción, controlado por este componente. */
  renderDialog: (dialog: { open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode;
}

/**
 * Botón de una acción del documento que abre su propio diálogo ("Cancelar
 * factura", "Timbrar"). El diálogo vive junto al botón: sin la acción no se
 * monta, pero si estaba abierto (la acción acaba de ejecutarse y el refetch la
 * retiró) sigue montado hasta cerrarse.
 */
export function DocumentActionWithDialog({
  offered,
  blockedNoteId,
  icon: Icon,
  label,
  className,
  renderDialog,
}: DocumentActionWithDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const blocked = blockedNoteId !== undefined;

  if (!offered && !isOpen) return null;

  return (
    <>
      {offered && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!blocked) setIsOpen(true);
          }}
          aria-disabled={blocked || undefined}
          aria-describedby={blockedNoteId}
          className={`aria-disabled:opacity-60 aria-disabled:cursor-not-allowed! ${className ?? ""}`.trim()}
        >
          <Icon className="w-4 h-4" aria-hidden="true" />
          {label}
        </Button>
      )}
      {renderDialog({ open: isOpen, onOpenChange: setIsOpen })}
    </>
  );
}
