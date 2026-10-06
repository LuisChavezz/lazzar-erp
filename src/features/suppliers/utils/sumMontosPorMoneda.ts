import { safeParseAmount } from "@/src/utils/formatCurrency";
import type { SupplierPurchaseOrderHistoryMonto } from "../interfaces/supplier-purchase-order-history.interface";

/**
 * Consolida `resumen.monto_por_moneda` en UNA entrada por moneda, sumando en
 * centavos enteros (el `total` llega como número JSON de punto flotante, o
 * string).
 *
 * El contrato promete una fila por moneda, pero el backend hoy devuelve VARIAS
 * filas con la misma moneda (verificado: una por orden; la agregación agrupa
 * también por los campos del orden del modelo). Esas filas son subconjuntos
 * disjuntos del conjunto filtrado, así que sumarlas da el total correcto; con
 * el backend corregido, cada moneda llega una vez y esto es la identidad. Se
 * conserva el orden de primera aparición.
 */
export const sumMontosPorMoneda = (
  montos: SupplierPurchaseOrderHistoryMonto[],
): { moneda: string; total: number }[] => {
  const centsByMoneda = new Map<string, number>();
  for (const { moneda, total } of montos) {
    const cents = Math.round(safeParseAmount(String(total)) * 100);
    centsByMoneda.set(moneda, (centsByMoneda.get(moneda) ?? 0) + cents);
  }
  return [...centsByMoneda].map(([moneda, cents]) => ({ moneda, total: cents / 100 }));
};
