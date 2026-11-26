import type {
  CreateSupplierReturnPayload,
  SupplierReturnPendingLine,
} from "../interfaces/supplier-return.interface";

/** Decimales de la captura: los de calidad (`cantidad_rechazada`, 2 posiciones). */
export const SUPPLIER_RETURN_QTY_DECIMALS = 2;

/** `cantidad_pendiente` como número; un valor que no parsee cuenta como 0. */
export const pendingQuantity = (line: Pick<SupplierReturnPendingLine, "cantidad_pendiente">): number => {
  const value = Number.parseFloat(line.cantidad_pendiente);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/**
 * Cantidad a devolver por renglón al abrir el diálogo: todo lo pendiente, que es
 * lo que el backend devolvería sin `detalles`. El usuario la baja o la vacía.
 */
export const initialReturnQuantities = (
  lines: readonly SupplierReturnPendingLine[],
): Record<number, string> =>
  Object.fromEntries(
    lines.map((line) => {
      const pending = pendingQuantity(line);
      return [line.calidad_detalle, pending > 0 ? String(pending) : ""];
    }),
  );

/**
 * Renglones del `POST`: solo los capturados con una cantidad mayor que cero,
 * recortada a lo pendiente y a 2 decimales (el input ya la limita; esto es la
 * última barrera). Un renglón que ya no está en `lines` (lo pendiente se
 * releyó) no se manda.
 */
export const buildSupplierReturnDetalles = (
  lines: readonly SupplierReturnPendingLine[],
  quantities: Readonly<Record<number, string>>,
): CreateSupplierReturnPayload["detalles"] =>
  lines.flatMap((line) => {
    const raw = Number.parseFloat(quantities[line.calidad_detalle] ?? "");
    if (!Number.isFinite(raw) || raw <= 0) return [];
    const cantidad = Math.min(raw, pendingQuantity(line));
    if (cantidad <= 0) return [];
    return [
      {
        calidad_detalle: line.calidad_detalle,
        cantidad: cantidad.toFixed(SUPPLIER_RETURN_QTY_DECIMALS),
      },
    ];
  });
