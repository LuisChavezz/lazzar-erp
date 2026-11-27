import type { ScanResult } from "@/src/components/ScanCapture";
import { normalizeScanCode } from "@/src/features/picking/utils/pickingScan";
import { formatExactQuantityValue as fmt } from "@/src/utils/formatCurrency";
import { splitSku } from "@/src/utils/sku";

/**
 * Renglón del alta de recepción, ya resuelto para pintarlo y escanearlo:
 * nombre, atributos, códigos y el techo: `tope`, lo pendiente exacto (lo que
 * mandan "Todo" y "Recibir todo", EC-900); la captura manual lo topa en
 * enteros (`capturaManualRecepcion`). `sinTope` es el motivo por el que no se
 * puede recibir, o `null`.
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

/** Talla visible: la del renglón o, si falta, la que trae el SKU. */
export const tallaDeRenglon = (line: Pick<ReceiptScanLine, "talla" | "sku">) =>
  line.talla?.trim() || splitSku(line.sku)?.talla || null;

/**
 * Lo que hace una lectura (pistola o antena) en el alta de recepción, sin
 * tocar estado: el resultado que se muestra, el renglón que se abre y resalta
 * (`null` si no hay que abrir ninguno) y, si suma, la `cantidad` nueva.
 * `qtyOf` es lo capturado HASTA esta lectura: en una tanda de la antena
 * incluye lo que sumaron las anteriores (`PendingQuantities`), así que el
 * pendiente se respeta exacto y lo que no cabe sale como "Ya está completo".
 */
export function leerEnRecepcion<T extends ReceiptScanLine>(
  lines: readonly T[],
  leido: string,
  qtyOf: (line: T) => number,
): { result: ScanResult; line: T | null; cantidad?: number } {
  // Con cupo = cabe una pieza más (un renglón con 0.5 por recibir no la tiene).
  const line = findReceiptLineByScan(lines, leido, (l) => qtyOf(l) + 1 <= l.tope);
  if (!line) return { result: { tone: "error", title: "No está en esta orden", detail: `Código ${leido}` }, line: null };
  const talla = tallaDeRenglon(line);
  const nombre = `${line.nombre}${talla ? ` · ${talla}` : ""}`;
  if (line.tope <= 0) return { result: { tone: "warn", title: line.sinTope ?? "Sin pendiente", detail: nombre }, line: null };
  const actual = qtyOf(line);
  if (actual + 1 > line.tope) {
    // Queda menos de una pieza (pendiente fraccionario): una etiqueta no cabe.
    return {
      result:
        actual < line.tope
          ? {
              tone: "warn",
              title: "Falta menos de una pieza",
              detail: `${nombre}: ${fmt(actual)} de ${fmt(line.tope)}. Usa "Todo" para recibir el resto.`,
            }
          : { tone: "warn", title: "Ya está completo", detail: `${nombre}: ${fmt(actual)} de ${fmt(line.tope)}` },
      line,
    };
  }
  return {
    result: { tone: "ok", title: `+1 ${nombre}`, detail: `${fmt(actual + 1)} de ${fmt(line.tope)}` },
    line,
    cantidad: actual + 1,
  };
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
