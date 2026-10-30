"use client";

import { useState } from "react";
import type { TipoCompra } from "../interfaces/purchase-order.interface";

interface UseTipoCompraChangeOptions {
  /** Renglones ya capturados en el Step 2. */
  lineCount: number;
  /** Descarta los renglones capturados. */
  onClearLines: () => void;
  /** Aplica el nuevo tipo al formulario del Step 1. */
  applyChange: (next: TipoCompra) => void;
}

/**
 * Cambio de tipo de compra en el Step 1 de alta/edición de OC (EC-657).
 *
 * Materia prima se compra por producto y producto terminado por SKU, así que
 * los renglones de un tipo no sirven para el otro: sin renglones el cambio se
 * aplica directo; con renglones se pide confirmación y, al confirmar, se aplica
 * y se descartan. Cancelar deja el tipo como estaba.
 */
export function useTipoCompraChange({
  lineCount,
  onClearLines,
  applyChange,
}: UseTipoCompraChangeOptions) {
  const [pendingTipo, setPendingTipo] = useState<TipoCompra | null>(null);

  const requestChange = (current: TipoCompra | undefined, next: TipoCompra) => {
    if (next === current) return;
    if (lineCount > 0) {
      setPendingTipo(next);
    } else {
      applyChange(next);
    }
  };

  const confirmDialogProps = {
    open: pendingTipo !== null,
    onOpenChange: (open: boolean) => {
      if (!open) setPendingTipo(null);
    },
    title: "¿Cambiar el tipo de compra?",
    description: `Materia prima se compra por producto y producto terminado por SKU, así que al cambiar el tipo se quitarán ${
      lineCount === 1 ? "el renglón capturado" : `los ${lineCount} renglones capturados`
    }.`,
    confirmText: "Cambiar y quitar renglones",
    confirmColor: "amber" as const,
    onConfirm: () => {
      if (pendingTipo !== null) {
        applyChange(pendingTipo);
        onClearLines();
      }
      setPendingTipo(null);
    },
  };

  return { requestChange, confirmDialogProps };
}
