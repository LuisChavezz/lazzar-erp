import { SALIDA_MAQUILA_ORIGENES } from "../constants/salidaMaquilaOrigen";
import type {
  CreateSalidaMaquilaDetalle,
  OpParaSalidaMaquila,
  OpParaSalidaMaquilaRenglon,
  SalidaMaquilaOrdenSeed,
  SalidaMaquilaOrigen,
  SalidaMaquilaRenglonOrigen,
} from "../interfaces/salida-maquila.interface";

/** Renglón editable del alta: piezas y precio como texto, tal cual se teclean. */
export interface SalidaMaquilaDraftLine {
  /** Renglón de la orden de origen (`op_detalle` / `ob_detalle` / `or_detalle`). */
  detalleId: number;
  descripcion: string;
  /** Piezas de ese renglón en la orden. */
  enOrden: number;
  cantidad: string;
  precio: string;
}

const QTY = /^\d+$/;
const PRICE = /^\d+(\.\d{1,4})?$/;

/** Prenda legible de la OP: SKU · talla · color, o lo que haya. */
export const describeRenglon = (r: OpParaSalidaMaquilaRenglon): string => {
  const v = r.producto_variante;
  if (v) return [v.sku, v.talla_nombre, v.color_nombre].filter(Boolean).join(" · ");
  return r.variante_produccion?.sku || r.variante_produccion?.nombre || `Renglón ${r.op_detalle_id}`;
};

/** Renglón de `detalles` de una OB u OR (mismos campos en las dos). */
export interface OrdenServicioRenglon {
  id: number;
  cantidad: number;
  sku?: string | null;
  producto_nombre: string | null;
  talla_nombre: string | null;
  color_nombre?: string | null;
}

/** Prenda legible de una OB u OR: SKU (o producto) · talla · color. */
export const describeRenglonServicio = (r: OrdenServicioRenglon): string =>
  [r.sku || r.producto_nombre, r.talla_nombre, r.color_nombre].filter(Boolean).join(" · ") ||
  `Renglón ${r.id}`;

/** Los renglones ACTIVOS de la OP, con su descripción. */
export const opRenglones = (renglones: OpParaSalidaMaquilaRenglon[]): SalidaMaquilaRenglonOrigen[] =>
  renglones
    .filter((r) => r.activo)
    .map((r) => ({ detalleId: r.op_detalle_id, descripcion: describeRenglon(r), cantidad: Number(r.cantidad) || 0 }));

/** La OP del retrieve como semilla del alta: su maquilero y su costo de maquila. */
export const opSeed = (op: OpParaSalidaMaquila): SalidaMaquilaOrdenSeed => ({
  origen: "OP",
  ordenId: op.op_id,
  centroConfeccion: op.centro_confeccion,
  precioSugerido: op.costo_maquila_unitario,
  renglones: opRenglones(op.orden_produccion_detalle),
});

/**
 * Una OB u OR (los `detalles` que la página ya cargó) como semilla del alta.
 * Sin precio sugerido: esas órdenes no tienen costo de maquila. La OB propone
 * su proveedor como maquilero; la OR no tiene.
 */
export const servicioSeed = (
  origen: Exclude<SalidaMaquilaOrigen, "OP">,
  ordenId: number,
  detalles: OrdenServicioRenglon[],
  proveedor: number | null = null,
): SalidaMaquilaOrdenSeed => ({
  origen,
  ordenId,
  centroConfeccion: origen === "OB" ? proveedor : null,
  precioSugerido: null,
  renglones: detalles.map((d) => ({
    detalleId: d.id,
    descripcion: describeRenglonServicio(d),
    cantidad: Number(d.cantidad) || 0,
  })),
});

/**
 * Borrador inicial: un renglón por cada renglón de la orden, con todas sus
 * piezas si aún no se ha enviado nada y en blanco si ya hubo salidas (el tope
 * es por orden, no por renglón, así que no se puede saber qué talla falta).
 */
export const initialDraft = (
  renglones: SalidaMaquilaRenglonOrigen[],
  precioSugerido: string | null,
  yaEnviadas: number,
): SalidaMaquilaDraftLine[] =>
  renglones.map((r) => ({
    detalleId: r.detalleId,
    descripcion: r.descripcion,
    enOrden: r.cantidad,
    cantidad: yaEnviadas > 0 ? "" : String(Math.round(r.cantidad)),
    precio: precioSugerido && Number(precioSugerido) > 0 ? String(Number(precioSugerido)) : "",
  }));

/**
 * Piezas del renglón: solo un entero tal cual se tecleó (espacios aparte). Lo
 * demás ("2.5", "2,5", "3 pz") vale 0 y se marca como inválido; nunca se
 * reinterpreta como otro número (quitar el punto convertía "2.5" en 25).
 */
export const lineQty = (l: SalidaMaquilaDraftLine): number =>
  QTY.test(l.cantidad.trim()) ? Number(l.cantidad.trim()) : 0;

/** ¿Hay algo escrito en piezas que no es un entero? */
export const hasInvalidQty = (l: SalidaMaquilaDraftLine): boolean =>
  l.cantidad.trim() !== "" && !QTY.test(l.cantidad.trim());

export const lineImporte = (l: SalidaMaquilaDraftLine): number =>
  PRICE.test(l.precio) ? lineQty(l) * Number(l.precio) : 0;

export type DraftProblem = "sin_piezas" | "excede" | "cantidad" | "precio";

/**
 * Lo que impide enviar el borrador, en el orden en que conviene decirlo. El
 * backend vuelve a validar todo; esto solo evita el viaje.
 */
export const draftProblems = (lines: SalidaMaquilaDraftLine[], quedan: number): DraftProblem[] => {
  const problems: DraftProblem[] = [];
  if (lines.some(hasInvalidQty)) problems.push("cantidad");
  const piezas = lines.reduce((acc, l) => acc + lineQty(l), 0);
  if (piezas <= 0) problems.push("sin_piezas");
  if (piezas > quedan) problems.push("excede");
  if (lines.some((l) => lineQty(l) > 0 && !(PRICE.test(l.precio) && Number(l.precio) > 0))) {
    problems.push("precio");
  }
  return problems;
};

/** Los renglones con piezas, en el orden en que viajan en `detalles`. */
export const linesToSend = (lines: SalidaMaquilaDraftLine[]): SalidaMaquilaDraftLine[] =>
  lines.filter((l) => lineQty(l) > 0);

/**
 * Solo viajan los renglones con piezas, con el campo de renglón de su origen.
 * El precio va siempre: en OB y OR es obligatorio y en la OP es el capturado.
 */
export const toDetalles = (
  lines: SalidaMaquilaDraftLine[],
  origen: SalidaMaquilaOrigen,
): CreateSalidaMaquilaDetalle[] => {
  const campo = SALIDA_MAQUILA_ORIGENES[origen].campoRenglon;
  return linesToSend(lines).map(
    (l) =>
      ({
        [campo]: l.detalleId,
        descripcion: l.descripcion,
        cantidad: String(lineQty(l)),
        precio_unitario: l.precio,
      }) as CreateSalidaMaquilaDetalle,
  );
};
