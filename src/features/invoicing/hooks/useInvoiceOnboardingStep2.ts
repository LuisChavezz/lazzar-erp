"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { Invoice } from "../interfaces/invoice.interface";
import type { InvoiceOnboardingData } from "../interfaces/invoice-onboarding.interface";
import { invoiceOnboardingPayloadSchema } from "../schemas/invoice-onboarding.schema";
import { estimateInvoice } from "../utils/invoiceEstimate";
import { useInvoiceOnboarding } from "./useInvoiceOnboarding";
import {
  parseCreateInvoiceError,
  useCreateInvoiceFromOnboarding,
} from "./useCreateInvoiceFromOnboarding";

/** Piezas capturadas por `pedido_detalle_talla`. "" = la talla no entra en esta factura. */
type QuantityMap = Map<number, string>;

/**
 * Ajusta lo capturado a datos frescos: una talla que dejó de ser facturable se
 * vacía y una cantidad por encima de su nuevo pendiente se recorta. Así la tabla
 * nunca muestra piezas que el servidor ya no aceptaría.
 */
const clampToPending = (quantities: QuantityMap, data: InvoiceOnboardingData): QuantityMap => {
  const next: QuantityMap = new Map();
  for (const talla of data.tallas) {
    const raw = quantities.get(talla.pedido_detalle_talla);
    if (!raw || !talla.facturable) continue;
    const value = Math.min(Number.parseInt(raw, 10) || 0, talla.cantidad_pendiente);
    if (value > 0) next.set(talla.pedido_detalle_talla, String(value));
  }
  return next;
};

/**
 * Estado del Paso 2 de "Nueva Factura": piezas por talla, estimación, envío y
 * resultado. Precedente: `usePickingStep2Form` (cantidades por talla con techo
 * en lo pendiente, recarga ante datos desactualizados).
 */
export function useInvoiceOnboardingStep2(pedidoId: number) {
  const onboarding = useInvoiceOnboarding(pedidoId);
  const { data } = onboarding;
  const { mutate, isPending } = useCreateInvoiceFromOnboarding();

  const [quantities, setQuantities] = useState<QuantityMap>(new Map());
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [staleNotice, setStaleNotice] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  // Cada carga NUEVA del onboarding (refetch tras un 400 de pendientes) recorta
  // lo capturado a los pendientes frescos. Patrón "ajustar estado al cambiar
  // una prop" de React: se compara contra la última respuesta vista.
  const [seenData, setSeenData] = useState<InvoiceOnboardingData | undefined>(data);
  if (data !== seenData) {
    setSeenData(data);
    if (data) setQuantities((prev) => clampToPending(prev, data));
  }

  const tallas = data?.tallas ?? [];
  const facturables = tallas.filter((talla) => talla.facturable);
  const hasPending = (data?.total_piezas_pendientes ?? 0) > 0 && facturables.length > 0;

  const numericQuantities = new Map<number, number>();
  for (const [id, raw] of quantities) {
    const value = Number.parseInt(raw, 10);
    if (value > 0) numericQuantities.set(id, value);
  }
  const estimate = estimateInvoice(tallas, numericQuantities, data?.porcentaje_impuesto ?? 0);

  const setQuantity = (pedidoDetalleTallaId: number, value: string) => {
    setErrorMessages([]);
    setQuantities((prev) => {
      const next = new Map(prev);
      if (value === "") next.delete(pedidoDetalleTallaId);
      else next.set(pedidoDetalleTallaId, value);
      return next;
    });
  };

  /** "Llenar todo lo pendiente": cada talla facturable a su pendiente. El usuario aún confirma. */
  const fillAllPending = () => {
    setErrorMessages([]);
    setQuantities(
      new Map(
        facturables.map((talla) => [talla.pedido_detalle_talla, String(talla.cantidad_pendiente)]),
      ),
    );
  };

  const clearAll = () => {
    setErrorMessages([]);
    setQuantities(new Map());
  };

  const submit = () => {
    if (!data || isPending || onboarding.isFetching) return;
    setStaleNotice(false);
    const parsed = invoiceOnboardingPayloadSchema.safeParse({
      pedido: data.pedido,
      factura_detalles: Array.from(numericQuantities, ([pedido_detalle_talla, cantidad]) => ({
        pedido_detalle_talla,
        cantidad,
      })),
    });
    if (!parsed.success) {
      setErrorMessages([parsed.error.issues[0]?.message ?? "Revisa las piezas capturadas"]);
      return;
    }

    mutate(parsed.data, {
      onSuccess: (invoice) => {
        setErrorMessages([]);
        setCreatedInvoice(invoice);
      },
      onError: (error) => {
        const { messages, isStalePending } = parseCreateInvoiceError(error);
        setErrorMessages(messages);
        if (isStalePending) {
          // Otra factura tomó esas piezas: se recargan los pendientes (lo
          // capturado se recorta a ellos) y se deja reintentar.
          setStaleNotice(true);
          void onboarding.refetch();
          toast("Las piezas pendientes cambiaron; se actualizaron los datos.", { icon: "ℹ️" });
        }
      },
    });
  };

  return {
    onboarding,
    data,
    tallas,
    hasPending,
    facturablesCount: facturables.length,
    quantities,
    setQuantity,
    fillAllPending,
    clearAll,
    estimate,
    // Mientras se recargan los pendientes (p. ej. tras un 400 de piezas ya
    // tomadas) no se envía: las cantidades aún no se recortan a los nuevos.
    canSubmit: estimate.piezas > 0 && !isPending && !onboarding.isFetching,
    submit,
    isPending,
    errorMessages,
    staleNotice,
    createdInvoice,
  };
}
