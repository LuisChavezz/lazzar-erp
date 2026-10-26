import { formatExactQuantityValue, safeParseAmount } from "@/src/utils/formatCurrency";
import type { PedidoCancelResponse } from "../interfaces/pedido-cancel.interface";

/** Diezmilésimas: la resolución con que el inventario mueve existencias (4 decimales). */
const QTY_SCALE = 10_000;

/**
 * Piezas que la cancelación devolvió al inventario: la suma de `cantidad`
 * (decimal en string) de `inventario_devuelto`. Se suma en diezmilésimas
 * ENTERAS para que "0.1" + "0.2" no arrastre error de coma flotante; un valor
 * no numérico cuenta como 0, y sin un arreglo el total es 0.
 */
const piezasDevueltas = (inventarioDevuelto: unknown): number => {
  if (!Array.isArray(inventarioDevuelto)) return 0;
  const total = inventarioDevuelto.reduce<number>((sum, item) => {
    const cantidad = safeParseAmount(
      item && typeof item === "object" ? String((item as { cantidad?: unknown }).cantidad ?? "") : "",
    );
    return Number.isFinite(cantidad) ? sum + Math.round(cantidad * QTY_SCALE) : sum;
  }, 0);
  return total / QTY_SCALE;
};

/**
 * Toast de éxito de "Cancelar pedido": "Pedido P-00083 cancelado · 1,510 piezas
 * devueltas, 1 reserva liberada". Cada parte se omite si es cero, y sin
 * ninguna queda solo "Pedido … cancelado". El folio sale de la respuesta y,
 * si viniera vacío, de `fallbackLabel` (el que mostró el diálogo).
 *
 * NUNCA lanza: corre en el `onSuccess` de una cancelación que ya ocurrió, así
 * que una respuesta incompleta (p. ej. de un backend sin los campos de
 * reintegro) solo pierde el resumen.
 */
export const pedidoCancelSummary = (
  response: Partial<PedidoCancelResponse> | null | undefined,
  fallbackLabel: string,
): string => {
  const data = response && typeof response === "object" ? response : {};
  const folio = (typeof data.folio === "string" && data.folio) || fallbackLabel;
  const head = folio ? `Pedido ${folio} cancelado` : "Pedido cancelado";
  const piezas = piezasDevueltas(data.inventario_devuelto);
  const reservas =
    typeof data.reservas_liberadas === "number" && Number.isFinite(data.reservas_liberadas)
      ? data.reservas_liberadas
      : 0;
  const parts = [
    piezas > 0 &&
      `${formatExactQuantityValue(piezas)} ${piezas === 1 ? "pieza devuelta" : "piezas devueltas"}`,
    reservas > 0 &&
      `${reservas} ${reservas === 1 ? "reserva liberada" : "reservas liberadas"}`,
  ].filter(Boolean);
  return parts.length > 0 ? `${head} · ${parts.join(", ")}` : head;
};
