import { getMexicoTodayDate, isCalendarDateKey, toMexicoIsoDateTime } from "@/src/utils/mexicoTime";
import type { PedidoListItem } from "../interfaces/order.interface";

/**
 * Un pedido se considera confirmado cuando ya tiene fecha de confirmación (la
 * fija Mesa de Control; solo se puede volver a vaciar si el pedido no tiene
 * programaciones: con ellas el backend responde 400 en `fecha_confirmacion`,
 * EC-750). Recibe solo ese campo para
 * que otros contratos de pedido (p. ej. los pedidos especiales de Producción)
 * compartan la misma regla. La usan el punto de color, el filtro "Por
 * confirmar / Confirmado", los KPIs de Mesa de Control y `canProgramarPedido`.
 */
export function isOrderConfirmed(order: Pick<PedidoListItem, "fecha_confirmacion">): boolean {
  return Boolean(order.fecha_confirmacion);
}

/*
 * `fecha_confirmacion` es un DÍA calendario (la fecha compromiso) que el
 * backend guarda como `DateTimeField` y lee como día de México (filtro por mes,
 * `fecha_base_compromiso`). Se escribe como la medianoche de México de ese día
 * y se lee en `MEXICO_TIME_ZONE`, así que el día es el mismo con el navegador
 * en cualquier zona (EC-936).
 */

/**
 * Valor que se manda al guardar el día `"YYYY-MM-DD"` elegido: su medianoche
 * en México con offset explícito, p. ej. `"2026-01-15T00:00:00-06:00"`.
 * `null` si el día no es válido (no se manda: `null` borraría la confirmación).
 */
export function toFechaConfirmacionPayload(dateKey: string): string | null {
  return toMexicoIsoDateTime(dateKey, "00:00");
}

/**
 * Día de México (`"YYYY-MM-DD"`) de `fecha_confirmacion`, como lo necesita el
 * `<input type="date">` del editor: el mismo día que muestran los lectores. No
 * `value.slice(0, 10)`: eso tomaría el día del offset en que lo serializó el
 * servidor. Un `"YYYY-MM-DD"` pelado ya es el día y pasa tal cual. `null` sin
 * valor o si no parsea.
 */
export function toFechaConfirmacionInputValue(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.includes("T")) return isCalendarDateKey(value) ? value : null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : getMexicoTodayDate(date);
}
