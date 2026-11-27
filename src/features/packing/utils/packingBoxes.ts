/**
 * Reparto de un embarque en cajas: qué prendas lleva cada caja y cuánto pesa.
 *
 * Lógica pura (sin React) para que la pantalla solo pinte. Cada caja guarda un
 * mapa `picking_detalle` → cantidad capturada (texto, tal como se teclea).
 * Todo se redondea a 4 decimales, la precisión del backend.
 */

export interface PackingBox {
  /** Identidad estable para React (no es el número de caja). */
  id: string;
  /** Peso en kg tal como se teclea; "" = sin capturar. */
  peso: string;
  /** `picking_detalle` → cantidad en esta caja. */
  contenido: Record<string, string>;
}

export interface PackingBoxLine {
  key: string;
  pendiente: number;
}

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;
const num = (raw: string | undefined) => {
  const n = Number.parseFloat(raw ?? "");
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// Id aleatorio, no un contador de módulo: un contador se reinicia al recargar
// el módulo y repetiría ids de cajas ya montadas.
export const newPackingBox = (): PackingBox => ({ id: crypto.randomUUID(), peso: "", contenido: {} });

export const boxQty = (box: PackingBox, key: string) => num(box.contenido[key]);

/** Lo ya acomodado de una línea entre todas las cajas. */
export const allocatedFor = (boxes: readonly PackingBox[], key: string) =>
  round4(boxes.reduce((acc, b) => acc + boxQty(b, key), 0));

/** Lo que falta por acomodar (negativo = de más). */
export const remainingFor = (boxes: readonly PackingBox[], line: PackingBoxLine) =>
  round4(line.pendiente - allocatedFor(boxes, line.key));

/** Piezas dentro de una caja. */
export const boxPieces = (box: PackingBox) =>
  round4(Object.values(box.contenido).reduce((acc, v) => acc + num(v), 0));

/** Peso total del embarque, a 3 decimales; null si ninguna caja trae peso. */
export function totalPeso(boxes: readonly PackingBox[]): number | null {
  const pesos = boxes.map((b) => num(b.peso));
  if (pesos.every((p) => p === 0)) return null;
  return Math.round(pesos.reduce((a, b) => a + b, 0) * 1000) / 1000;
}

/** Pone en `boxIndex` lo que le falta a cada línea (sin tocar las demás cajas). */
export function fillRemaining(
  boxes: readonly PackingBox[],
  boxIndex: number,
  lines: readonly PackingBoxLine[],
): PackingBox[] {
  return boxes.map((box, i) => {
    if (i !== boxIndex) return box;
    const contenido = { ...box.contenido };
    for (const line of lines) {
      const falta = remainingFor(boxes, line);
      if (falta > 0) contenido[line.key] = String(round4(boxQty(box, line.key) + falta));
    }
    return { ...box, contenido };
  });
}

/** Mueve una línea completa (todo su pendiente) a una sola caja. */
export function moveLineTo(
  boxes: readonly PackingBox[],
  boxIndex: number,
  line: PackingBoxLine,
): PackingBox[] {
  return boxes.map((box, i) => ({
    ...box,
    contenido: { ...box.contenido, [line.key]: i === boxIndex ? String(line.pendiente) : "" },
  }));
}

/** Quita una caja; lo que llevaba vuelve a quedar por acomodar. */
export const removeBox = (boxes: readonly PackingBox[], boxIndex: number) =>
  boxes.filter((_, i) => i !== boxIndex);

/** Total por línea sumando todas las cajas (lo que hoy acepta el POST). */
export function lineTotals(
  boxes: readonly PackingBox[],
  lines: readonly PackingBoxLine[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of lines) {
    const total = allocatedFor(boxes, line.key);
    if (total > 0) out[line.key] = total;
  }
  return out;
}

export interface PackingBoxesStatus {
  /** Piezas acomodadas en total. */
  acomodadas: number;
  /** Piezas pendientes del surtido. */
  pendientes: number;
  /** Líneas con más piezas en cajas que su pendiente. */
  excedidas: string[];
  /** Cajas (número 1-based) sin ninguna pieza. */
  cajasVacias: number[];
  /** Cajas (número 1-based) sin peso: el backend lo exige por caja. */
  cajasSinPeso: number[];
}

export function boxesStatus(
  boxes: readonly PackingBox[],
  lines: readonly PackingBoxLine[],
): PackingBoxesStatus {
  return {
    acomodadas: round4(lines.reduce((acc, l) => acc + Math.min(allocatedFor(boxes, l.key), l.pendiente), 0)),
    pendientes: round4(lines.reduce((acc, l) => acc + Math.max(0, l.pendiente), 0)),
    excedidas: lines.filter((l) => remainingFor(boxes, l) < 0).map((l) => l.key),
    cajasVacias: boxes.flatMap((b, i) => (boxPieces(b) > 0 ? [] : [i + 1])),
    cajasSinPeso: boxes.flatMap((b, i) => (num(b.peso) > 0 ? [] : [i + 1])),
  };
}

/**
 * Contrato propuesto al backend (`cajas` en `POST /wms/packings/`). Aún NO se
 * envía: el backend lo ignoraría (ver CLAUDE.md, campos aceptados pero
 * ignorados). Listo para conectarse cuando exista.
 */
export function buildCajasPayload(boxes: readonly PackingBox[], lines: readonly PackingBoxLine[]) {
  return boxes.map((box, i) => ({
    numero: i + 1,
    ...(num(box.peso) > 0 ? { peso: String(num(box.peso)) } : {}),
    contenido: lines
      .filter((l) => boxQty(box, l.key) > 0)
      .map((l) => ({ picking_detalle: Number(l.key), cantidad: String(round4(boxQty(box, l.key))) })),
  }));
}

/**
 * Captura la cantidad de una prenda en una caja y, si con eso se pasa de lo
 * pendiente, descuenta el excedente de las OTRAS cajas (de la última hacia la
 * primera). Así repartir 10 en 6/4 es teclear "4" en la caja 2, sin dejar
 * "de más" que corregir a mano. Nunca deja más de lo pendiente en la caja.
 */
export function setBoxLineQty(
  boxes: readonly PackingBox[],
  boxIndex: number,
  line: PackingBoxLine,
  raw: string,
): PackingBox[] {
  const capturada = num(raw);
  const valor = capturada > line.pendiente ? String(line.pendiente) : raw;
  let next = boxes.map((b, i) =>
    i === boxIndex ? { ...b, contenido: { ...b.contenido, [line.key]: valor } } : b,
  );
  let exceso = round4(allocatedFor(next, line.key) - line.pendiente);
  for (let i = next.length - 1; i >= 0 && exceso > 0; i--) {
    if (i === boxIndex) continue;
    const actual = boxQty(next[i], line.key);
    if (actual <= 0) continue;
    const quita = Math.min(actual, exceso);
    const queda = round4(actual - quita);
    exceso = round4(exceso - quita);
    next = next.map((b, j) =>
      j === i ? { ...b, contenido: { ...b.contenido, [line.key]: queda > 0 ? String(queda) : "" } } : b,
    );
  }
  return next;
}
