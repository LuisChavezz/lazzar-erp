"use client";

import { useState } from "react";
import { PurchaseOrderDetallePrecioSchema } from "../schemas/purchase-order-onboarding.schema";

/**
 * Precios editables por producto en el Step 2 de alta/edición de orden de
 * compra, en paralelo al Record de `quantities` del llamador (mismas claves:
 * id de producto). `togglePrice` siembra o retira un renglón junto con su
 * `quantities` correspondiente.
 */
export function usePriceEntries(
  quantities: Record<number, number>,
  initialPrices: Record<number, string> | (() => Record<number, string>) = {},
) {
  const [prices, setPrices] = useState<Record<number, string>>(initialPrices);

  const setPrice = (id: number, value: string) => {
    setPrices((prev) => ({ ...prev, [id]: value }));
  };

  const togglePrice = (id: number, getDefaultPrice: () => string) => {
    setPrices((prev) => {
      if (id in prev) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: getDefaultPrice() };
    });
  };

  const priceErrors: Record<number, string> = {};
  Object.keys(quantities).forEach((idStr) => {
    const id = Number(idStr);
    const parsed = PurchaseOrderDetallePrecioSchema.safeParse(prices[id] ?? "");
    if (!parsed.success) {
      priceErrors[id] = parsed.error.issues[0].message;
    }
  });

  const hasPriceErrors = Object.keys(priceErrors).length > 0;

  return { prices, setPrice, togglePrice, priceErrors, hasPriceErrors };
}
