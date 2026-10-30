"use client";

import { useMemo, useState } from "react";
import { PurchaseOrderDetallePrecioSchema } from "../schemas/purchase-order-onboarding.schema";
import type { PurchaseOrderLine, PurchaseOrderLineKey } from "../utils/purchaseOrderLines";

interface LinesState {
  /** Renglones marcados, en el orden en que se marcaron. */
  lines: PurchaseOrderLine[];
  quantities: Partial<Record<PurchaseOrderLineKey, number>>;
  /** Precio editable en texto, por renglón. */
  prices: Partial<Record<PurchaseOrderLineKey, string>>;
}

const EMPTY: LinesState = { lines: [], quantities: {}, prices: {} };

/** Renglones guardados de la orden, todos marcados con su cantidad y precio. */
export const linesStateFrom = (
  seed: { line: PurchaseOrderLine; cantidad: number }[],
): LinesState => ({
  lines: seed.map((s) => s.line),
  quantities: Object.fromEntries(seed.map((s) => [s.line.key, s.cantidad])),
  prices: Object.fromEntries(seed.map((s) => [s.line.key, s.line.precioInicial])),
});

/**
 * Renglones elegidos en el Step 2 de alta/edición de OC (cantidad y precio por
 * renglón), indexados por {@link PurchaseOrderLineKey}.
 *
 * Vive en el step manager, no en el Step 2: el Step 1 necesita saber si ya hay
 * renglones (cambiar MP↔PT los descarta tras confirmar) y poder vaciarlos.
 * Un solo estado para los tres campos, para que un renglón nunca quede con
 * cantidad y sin precio o al revés.
 */
export function usePurchaseOrderLines() {
  const [state, setState] = useState<LinesState>(EMPTY);

  const isSelected = (key: PurchaseOrderLineKey) => key in state.quantities;

  /** Marca el renglón (cantidad 1, su precio inicial) o lo quita si ya estaba. */
  const toggle = (line: PurchaseOrderLine) => {
    setState((prev) => {
      if (line.key in prev.quantities) {
        const quantities = { ...prev.quantities };
        const prices = { ...prev.prices };
        delete quantities[line.key];
        delete prices[line.key];
        return { lines: prev.lines.filter((l) => l.key !== line.key), quantities, prices };
      }
      return {
        lines: [...prev.lines, line],
        quantities: { ...prev.quantities, [line.key]: 1 },
        prices: { ...prev.prices, [line.key]: line.precioInicial },
      };
    });
  };

  const setQuantity = (key: PurchaseOrderLineKey, cantidad: number) => {
    setState((prev) => ({ ...prev, quantities: { ...prev.quantities, [key]: cantidad } }));
  };

  const setPrice = (key: PurchaseOrderLineKey, precio: string) => {
    setState((prev) => ({ ...prev, prices: { ...prev.prices, [key]: precio } }));
  };

  const reset = (next: LinesState) => setState(next);
  const clear = () => setState(EMPTY);

  // Se memoiza porque valida TODOS los renglones marcados: con la lista
  // virtualizada es normal llegar a cientos, y sin esto se re-ejecutarían
  // cientos de `safeParse` en cada render (cada tecla del buscador, cada clic
  // del stepper) antes de pintar.
  const priceErrors = useMemo(() => {
    const errors: Partial<Record<PurchaseOrderLineKey, string>> = {};
    state.lines.forEach(({ key }) => {
      const parsed = PurchaseOrderDetallePrecioSchema.safeParse(state.prices[key] ?? "");
      if (!parsed.success) {
        errors[key] = parsed.error.issues[0].message;
      }
    });
    return errors;
  }, [state]);

  return {
    lines: state.lines,
    quantities: state.quantities,
    prices: state.prices,
    count: state.lines.length,
    isSelected,
    toggle,
    setQuantity,
    setPrice,
    reset,
    clear,
    priceErrors,
    hasPriceErrors: Object.keys(priceErrors).length > 0,
  };
}

export type PurchaseOrderLinesState = ReturnType<typeof usePurchaseOrderLines>;
