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

/** Largo de un arreglo de la respuesta; sin arreglo, 0. */
const countOf = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

/**
 * Toast de éxito de "Cancelar pedido": "Pedido P-00083 cancelado · 1,510 piezas
 * devueltas, 1 reserva liberada, 1 pre-orden cancelada, 2 OC marcadas con pedido
 * cancelado". Las dos últimas salen de la cascada (nucleo-erp#1357): la
 * pre-orden abierta se cancela y las OC autorizadas o parcialmente recibidas se
 * marcan (no se cancelan). Cada parte se omite si es cero, y sin
 * ninguna queda solo "Pedido … cancelado". El folio sale de la respuesta; si
 * viniera vacío, del que mostró el diálogo, y sin ninguno, `#id`: siempre hay
 * con qué nombrarlo.
 *
 * NUNCA lanza: corre en el `onSuccess` de una cancelación que ya ocurrió, así
 * que una respuesta incompleta (p. ej. de un backend sin los campos de
 * reintegro) solo pierde el resumen.
 */
export const pedidoCancelSummary = (
  response: Partial<PedidoCancelResponse> | null | undefined,
  pedido: { id: number; folio: string | null },
): string => {
  const data = response && typeof response === "object" ? response : {};
  const label =
    (typeof data.folio === "string" && data.folio) || pedido.folio || `#${pedido.id}`;
  const head = `Pedido ${label} cancelado`;
  const piezas = piezasDevueltas(data.inventario_devuelto);
  const reservas =
    typeof data.reservas_liberadas === "number" && Number.isFinite(data.reservas_liberadas)
      ? data.reservas_liberadas
      : 0;
  const preOrdenes = countOf(data.pre_ordenes_canceladas);
  const ocsMarcadas = countOf(data.ordenes_compra_marcadas);
  const parts = [
    piezas > 0 &&
      `${formatExactQuantityValue(piezas)} ${piezas === 1 ? "pieza devuelta" : "piezas devueltas"}`,
    reservas > 0 &&
      `${reservas} ${reservas === 1 ? "reserva liberada" : "reservas liberadas"}`,
    preOrdenes > 0 &&
      `${preOrdenes} ${preOrdenes === 1 ? "pre-orden cancelada" : "pre-órdenes canceladas"}`,
    ocsMarcadas > 0 &&
      `${ocsMarcadas} ${ocsMarcadas === 1 ? "OC marcada" : "OC marcadas"} con pedido cancelado`,
  ].filter(Boolean);
  return parts.length > 0 ? `${head} · ${parts.join(", ")}` : head;
};
