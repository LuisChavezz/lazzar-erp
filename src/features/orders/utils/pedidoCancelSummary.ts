import { formatExactQuantityValue, safeParseAmount } from "@/src/utils/formatCurrency";
import type { PedidoCancelResponse } from "../interfaces/pedido-cancel.interface";

/** Diezmilésimas: la resolución con que el inventario mueve existencias (4 decimales). */
const QTY_SCALE = 10_000;

/**
 * Piezas que la cancelación devolvió al inventario: la suma de `cantidad`
 * (decimal en string) de `inventario_devuelto`. Se suma en diezmilésimas
 * ENTERAS para que "0.1" + "0.2" no arrastre error de coma flotante; un valor
 * no numérico cuenta como 0.
 */
const piezasDevueltas = (response: PedidoCancelResponse): number => {
  const total = response.inventario_devuelto.reduce((sum, item) => {
    const cantidad = safeParseAmount(item.cantidad);
    return Number.isFinite(cantidad) ? sum + Math.round(cantidad * QTY_SCALE) : sum;
  }, 0);
  return total / QTY_SCALE;
};

/**
 * Toast de éxito de "Cancelar pedido": "Pedido P-00083 cancelado · 1,510 piezas
 * devueltas, 1 reserva liberada". Cada parte se omite si es cero, y sin
 * ninguna queda solo "Pedido … cancelado". El folio sale de la respuesta y,
 * si viniera vacío, de `fallbackLabel` (el que mostró el diálogo).
 */
export const pedidoCancelSummary = (
  response: PedidoCancelResponse,
  fallbackLabel: string,
): string => {
  const head = `Pedido ${response.folio || fallbackLabel} cancelado`;
  const piezas = piezasDevueltas(response);
  const reservas = response.reservas_liberadas;
  const parts = [
    piezas > 0 &&
      `${formatExactQuantityValue(piezas)} ${piezas === 1 ? "pieza devuelta" : "piezas devueltas"}`,
    reservas > 0 &&
      `${reservas} ${reservas === 1 ? "reserva liberada" : "reservas liberadas"}`,
  ].filter(Boolean);
  return parts.length > 0 ? `${head} · ${parts.join(", ")}` : head;
};
