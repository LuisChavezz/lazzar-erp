import {
  pendienteRecepcion,
  recortarCantidades,
  tieneCantidadRecibida,
} from "@/src/features/receipts/utils/receiptQuantities";
import type {
  CreateSupplierReturnPayload,
  SupplierReturnPendingLine,
} from "../interfaces/supplier-return.interface";

/**
 * Las cantidades del alta siguen la convención de recepciones (EC-900/EC-924,
 * `receipts/utils/receiptQuantities`): la captura manual es en piezas ENTERAS
 * (`QuantitySelector` + `capturaManualRecepcion`) y un pendiente fraccionario
 * solo se devuelve completo con "Todo", que fija el `cantidad_pendiente` del
 * backend tal cual. Nada se redondea: lo que se manda es lo capturado o ese
 * texto.
 */

/** `cantidad_pendiente` como número (lo máximo devolvible); 0 si no es positivo. */
export const pendingQuantity = (line: Pick<SupplierReturnPendingLine, "cantidad_pendiente">): number =>
  pendienteRecepcion(line.cantidad_pendiente);

/**
 * Cantidades tras (re)leer `pendientes/`: lo capturado se CONSERVA, recortado
 * al pendiente nuevo de su renglón con la regla de recepciones
 * (`recortarCantidades`: una captura entera se topa en piezas enteras, una
 * fraccionaria —la fijó "Todo"— al pendiente exacto). Solo los renglones
 * nuevos arrancan vacíos; los que ya no están se descartan.
 */
export const reconcileReturnQuantities = (
  previous: Readonly<Record<number, string>>,
  lines: readonly SupplierReturnPendingLine[],
): Record<number, string> => {
  const kept: Record<string, string> = {};
  for (const line of lines) {
    const value = previous[line.calidad_detalle];
    if (value !== undefined) kept[String(line.calidad_detalle)] = value;
  }
  const topes = new Map(lines.map((line) => [line.calidad_detalle, pendingQuantity(line)]));
  const recortadas = recortarCantidades(kept, topes);
  return Object.fromEntries(
    lines.map((line) => {
      const key = String(line.calidad_detalle);
      return [line.calidad_detalle, recortadas[key] ?? kept[key] ?? ""];
    }),
  );
};

/**
 * Renglones del `POST`: solo los capturados con una cantidad mayor que cero.
 * Si lo capturado alcanza lo pendiente ("Todo", o lo releído quedó por debajo),
 * se manda el `cantidad_pendiente` del backend TAL CUAL ("0.3350"), nunca un
 * número redondeado que lo rebase. Lo demás va como se capturó (enteros).
 */
export const buildSupplierReturnDetalles = (
  lines: readonly SupplierReturnPendingLine[],
  quantities: Readonly<Record<number, string>>,
): CreateSupplierReturnPayload["detalles"] =>
  lines.flatMap((line) => {
    const value = quantities[line.calidad_detalle];
    const pending = pendingQuantity(line);
    if (pending <= 0 || !tieneCantidadRecibida(value)) return [];
    const cantidad = Number(value) >= pending ? line.cantidad_pendiente : String(value).trim();
    return [{ calidad_detalle: line.calidad_detalle, cantidad }];
  });
