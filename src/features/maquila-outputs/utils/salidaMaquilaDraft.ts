import type {
  CreateSalidaMaquilaDetalle,
  OpParaSalidaMaquilaRenglon,
} from "../interfaces/salida-maquila.interface";

/** Renglón editable del alta: piezas y precio como texto, tal cual se teclean. */
export interface SalidaMaquilaDraftLine {
  opDetalle: number;
  descripcion: string;
  /** Piezas de ese renglón en la OP. */
  enOp: number;
  cantidad: string;
  precio: string;
}

const QTY = /^\d+$/;
const PRICE = /^\d+(\.\d{1,4})?$/;

/** Prenda legible: SKU · talla · color, o lo que haya. */
export const describeRenglon = (r: OpParaSalidaMaquilaRenglon): string => {
  const v = r.producto_variante;
  if (v) return [v.sku, v.talla_nombre, v.color_nombre].filter(Boolean).join(" · ");
  return r.variante_produccion?.sku || r.variante_produccion?.nombre || `Renglón ${r.op_detalle_id}`;
};

/**
 * Borrador inicial: un renglón por cada renglón activo de la OP, con todas sus
 * piezas si aún no se ha enviado nada y en blanco si ya hubo salidas (el tope
 * es por OP, no por renglón, así que no se puede saber qué talla falta).
 */
export const initialDraft = (
  renglones: OpParaSalidaMaquilaRenglon[],
  costo: string | null,
  yaEnviadas: number,
): SalidaMaquilaDraftLine[] =>
  renglones
    .filter((r) => r.activo)
    .map((r) => {
      const enOp = Number(r.cantidad) || 0;
      return {
        opDetalle: r.op_detalle_id,
        descripcion: describeRenglon(r),
        enOp,
        cantidad: yaEnviadas > 0 ? "" : String(Math.round(enOp)),
        precio: costo && Number(costo) > 0 ? String(Number(costo)) : "",
      };
    });

export const lineQty = (l: SalidaMaquilaDraftLine): number => (QTY.test(l.cantidad) ? Number(l.cantidad) : 0);

export const lineImporte = (l: SalidaMaquilaDraftLine): number =>
  PRICE.test(l.precio) ? lineQty(l) * Number(l.precio) : 0;

export type DraftProblem = "sin_piezas" | "excede" | "cantidad" | "precio";

/**
 * Lo que impide enviar el borrador, en el orden en que conviene decirlo. El
 * backend vuelve a validar todo; esto solo evita el viaje.
 */
export const draftProblems = (lines: SalidaMaquilaDraftLine[], quedan: number): DraftProblem[] => {
  const problems: DraftProblem[] = [];
  const usadas = lines.filter((l) => l.cantidad.trim() !== "");
  if (usadas.some((l) => !QTY.test(l.cantidad))) problems.push("cantidad");
  const piezas = lines.reduce((acc, l) => acc + lineQty(l), 0);
  if (piezas <= 0) problems.push("sin_piezas");
  if (piezas > quedan) problems.push("excede");
  if (lines.some((l) => lineQty(l) > 0 && !(PRICE.test(l.precio) && Number(l.precio) > 0))) {
    problems.push("precio");
  }
  return problems;
};

/** Solo viajan los renglones con piezas. */
export const toDetalles = (lines: SalidaMaquilaDraftLine[]): CreateSalidaMaquilaDetalle[] =>
  lines
    .filter((l) => lineQty(l) > 0)
    .map((l) => ({
      op_detalle: l.opDetalle,
      descripcion: l.descripcion,
      cantidad: String(lineQty(l)),
      precio_unitario: l.precio,
    }));
