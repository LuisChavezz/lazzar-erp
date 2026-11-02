"use client";

import { useState } from "react";
import type { PurchaseOrderOnboardingData } from "../interfaces/purchase-order-onboarding.interface";
import { onboardingMonedaCodigo } from "../utils/onboardingMonedaCodigo";
import { resolveProveedorChange } from "../utils/supplierDefaultMoneda";

interface UseProveedorMonedaChangeOptions {
  onboardingData: PurchaseOrderOnboardingData;
  /** Renglones del Step 2 con precio capturado. */
  pricedLineCount: number;
  /**
   * Aplica el proveedor al formulario del Step 1 y, si no es `null`, su moneda.
   */
  applyChange: (proveedor: number, moneda: number | null) => void;
}

interface PendingChange {
  proveedor: number;
  moneda: number;
  monedaActual: number;
}

/**
 * Cambio de proveedor en el Step 1 de la "Nueva OC" (EC-689): preselecciona la
 * moneda del proveedor (ver {@link resolveProveedorChange}). Se llama solo
 * desde el `onChange` del select, nunca desde un efecto que observe el
 * proveedor: el Step 1 se remonta desde lo capturado al "Volver" del Step 2 y
 * ahí no debe pisar la moneda.
 *
 * Si la moneda cambiaría y ya hay renglones con precio, pide confirmación
 * (mismo patrón que el tipo de compra): confirmar aplica proveedor y moneda sin
 * convertir los precios; cancelar deja ambos como estaban.
 */
export function useProveedorMonedaChange({
  onboardingData,
  pricedLineCount,
  applyChange,
}: UseProveedorMonedaChangeOptions) {
  // `pending` sobrevive al cierre para que el texto no se vacíe mientras el
  // diálogo anima su salida; lo que lo abre o cierra es `open`.
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [open, setOpen] = useState(false);

  const requestChange = (nextProveedor: number, currentMoneda: number) => {
    const { moneda, needsConfirmation } = resolveProveedorChange({
      onboardingData,
      nextProveedor,
      currentMoneda,
      pricedLineCount,
    });
    if (needsConfirmation && moneda !== null) {
      setPending({ proveedor: nextProveedor, moneda, monedaActual: currentMoneda });
      setOpen(true);
    } else {
      applyChange(nextProveedor, moneda);
    }
  };

  const codigoDe = (monedaId: number) =>
    onboardingMonedaCodigo(onboardingData, monedaId) ?? "otra moneda";
  // Sin moneda actual resoluble (p. ej. se dejó en "Seleccionar moneda…" al
  // volver del Step 2) no se nombra una moneda anterior que no existe.
  const codigoActual = pending ? onboardingMonedaCodigo(onboardingData, pending.monedaActual) : null;

  const confirmDialogProps = {
    open,
    onOpenChange: (nextOpen: boolean) => {
      if (!nextOpen) setOpen(false);
    },
    title: "¿Cambiar la moneda de la orden?",
    description: pending
      ? `Este proveedor maneja ${codigoDe(pending.moneda)}, así que la orden ${
          codigoActual
            ? `pasará de ${codigoActual} a ${codigoDe(pending.moneda)}`
            : `quedará en ${codigoDe(pending.moneda)}`
        }. ${
          pricedLineCount === 1
            ? "El precio capturado no se convierte: revísalo"
            : `Los precios de los ${pricedLineCount} renglones capturados no se convierten: revísalos`
        } antes de guardar.`
      : "",
    confirmText: "Cambiar proveedor y moneda",
    confirmColor: "amber" as const,
    onConfirm: () => {
      if (open && pending !== null) applyChange(pending.proveedor, pending.moneda);
      setOpen(false);
    },
  };

  return { requestChange, confirmDialogProps };
}
