import { normalizeScanCode } from "@/src/features/picking/utils/pickingScan";

/**
 * Renglón del alta de recepción, ya resuelto para pintarlo y escanearlo:
 * nombre, atributos, códigos y el techo de captura (lo pendiente en piezas
 * enteras). `sinTope` es el motivo por el que no se puede recibir, o `null`.
 */
export interface ReceiptScanLine {
  id: number;
  nombre: string;
  color: string | null;
  talla: string | null;
  /** SKU de la variante/muestra: lo que trae la etiqueta (sin "/"). */
  sku: string | null;
  /** Código raíz (modelo) y Proscai del producto (nucleo-erp #1285). */
  codigo: string | null;
  proscai: string | null;
  ordenado: number;
  pendiente: number;
  /** Piezas del renglón en SM Enviadas: se reciben con su SM, no aquí (nucleo-erp #1234). */
  enMaquila: number;
  /** Folios de esas SM (`salidas_maquila[].folio` del renglón), para decir con cuál recibirlas. */
  enMaquilaFolios: string[];
  tope: number;
  sinTope: string | null;
}

/** Códigos con los que se reconoce un renglón al escanear. */
export const receiptScanCodes = (line: Pick<ReceiptScanLine, "sku" | "codigo" | "proscai">): string[] =>
  [line.sku, line.codigo, line.proscai].map(normalizeScanCode).filter((c) => c.length > 0);

/**
 * Renglón de un código escaneado (SKU, raíz o Proscai, como en el surtido).
 * Si el código está en varios renglones (un Proscai sin talla), gana
 * el primero con cupo; si ninguno tiene, el primero (para decir "completo").
 */
export function findReceiptLineByScan<T extends ReceiptScanLine>(
  lines: readonly T[],
  code: string,
  hasRoom: (line: T) => boolean,
): T | null {
  const target = normalizeScanCode(code);
  if (!target) return null;
  const matches = lines.filter((l) => receiptScanCodes(l).includes(target));
  return matches.find(hasRoom) ?? matches[0] ?? null;
}

export interface ReceiptLineGroup<T> {
  key: string;
  nombre: string;
  color: string | null;
  lines: T[];
}

/** Agrupa por producto + color (el renglón que se reconoce), en orden de llegada. */
export function groupReceiptLines<T extends ReceiptScanLine>(lines: readonly T[]): ReceiptLineGroup<T>[] {
  const groups = new Map<string, ReceiptLineGroup<T>>();
  for (const line of lines) {
    const key = `${line.nombre}|${line.color ?? "-"}`;
    const group = groups.get(key) ?? { key, nombre: line.nombre, color: line.color, lines: [] };
    group.lines.push(line);
    groups.set(key, group);
  }
  return [...groups.values()];
}
