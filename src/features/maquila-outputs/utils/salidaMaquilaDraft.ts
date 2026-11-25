import type {
  CreateSalidaMaquilaBody,
  CreateSalidaMaquilaDetalle,
  OpParaSalidaMaquila,
  OpParaSalidaMaquilaRenglon,
  SalidaMaquilaOrdenSeed,
  SalidaMaquilaOrigen,
  SalidaMaquilaRenglonOrigen,
} from "../interfaces/salida-maquila.interface";
import { workOrderProductLabel } from "@/src/utils/workOrderProductLabel";

/** Renglón editable del alta: piezas y precio como texto, tal cual se teclean. */
export interface SalidaMaquilaDraftLine {
  /** Renglón de la orden de origen (`op_detalle` / `ob_detalle` / `or_detalle`). */
  detalleId: number;
  descripcion: string;
  /** Ver `SalidaMaquilaRenglonOrigen.descripcionDelServidor`. */
  descripcionDelServidor?: boolean;
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
  return (
    r.variante_produccion_sku ||
    r.variante_produccion?.sku ||
    r.variante_produccion?.nombre ||
    `Renglón ${r.op_detalle_id}`
  );
};

/** Renglón de `detalles` de una OB u OR (mismos campos en las dos). */
export interface OrdenServicioRenglon {
  id: number;
  cantidad: number;
  sku?: string | null;
  /** `null` en un renglón de MUESTRA con SKU (EC-964). */
  producto?: number | null;
  /** Se omite en un renglón sin producto (EC-964). */
  producto_nombre?: string | null;
  talla_nombre: string | null;
  color_nombre?: string | null;
}

/**
 * Prenda legible de una OB u OR: SKU (o producto) · talla · color. Un renglón
 * de muestra no trae nombre en el detalle de la orden y se rotula con
 * `workOrderProductLabel` («Sin producto de catálogo»), nunca vacío.
 */
export const describeRenglonServicio = (r: OrdenServicioRenglon): string =>
  [r.sku || workOrderProductLabel(r), r.talla_nombre, r.color_nombre].filter(Boolean).join(" · ");

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
    // Muestra (OB u OR): el alta no manda `descripcion` y el backend escribe el
    // nombre externo de la muestra (EC-964). `descripcion` queda como vista previa.
    ...(d.producto === null ? { descripcionDelServidor: true } : {}),
    cantidad: Number(d.cantidad) || 0,
  })),
});

/**
 * Borrador inicial: un renglón por cada renglón de la orden, siempre con las
 * piezas en blanco (EC-922). Solo sale lo que el usuario captura: un renglón
 * prellenado que no se tocó viajaba igual, y el aviso de salida parcial lo
 * contaba. "Todas" y el botón de cada renglón siguen llenándolos de un clic.
 * El precio sí parte del costo de maquila de la OP, si lo hay.
 */
export const initialDraft = (
  renglones: SalidaMaquilaRenglonOrigen[],
  precioSugerido: string | null,
): SalidaMaquilaDraftLine[] =>
  renglones.map((r) => ({
    detalleId: r.detalleId,
    descripcion: r.descripcion,
    ...(r.descripcionDelServidor ? { descripcionDelServidor: true } : {}),
    enOrden: r.cantidad,
    cantidad: "",
    precio: precioSugerido && Number(precioSugerido) > 0 ? String(Number(precioSugerido)) : "",
  }));

/**
 * Piezas del renglón: solo un entero tal cual se tecleó (espacios aparte). Lo
 * demás ("2.5", "2,5", "3 pz") vale 0 y se marca como inválido; nunca se
 * reinterpreta como otro número (quitar el punto convertía "2.5" en 25).
 */
export const lineQty = (l: SalidaMaquilaDraftLine): number =>
  QTY.test(l.cantidad.trim()) ? Number(l.cantidad.trim()) : 0;

/**
 * Piezas con que el botón de un renglón lo llena (EC-922). Sin salidas previas,
 * todas las del renglón, como siempre. Con salidas previas el tope es por
 * orden (`quedan`), no por renglón: el renglón toma a lo más lo que queda
 * libre después de lo que ya llevan los demás, nunca menos de 0.
 */
export const piezasParaLlenar = (
  lines: SalidaMaquilaDraftLine[],
  detalleId: number,
  quedan: number,
  yaEnviadas: number,
): number => {
  const line = lines.find((l) => l.detalleId === detalleId);
  if (!line) return 0;
  const todas = Math.round(line.enOrden);
  if (yaEnviadas <= 0) return todas;
  const enOtros = lines.reduce((acc, l) => (l.detalleId === detalleId ? acc : acc + lineQty(l)), 0);
  return Math.max(0, Math.min(todas, quedan - enOtros));
};

/** ¿Hay algo escrito en piezas que no es un entero? */
export const hasInvalidQty = (l: SalidaMaquilaDraftLine): boolean =>
  l.cantidad.trim() !== "" && !QTY.test(l.cantidad.trim());

/**
 * Precio del renglón: un decimal con punto (hasta 4 decimales) mayor que 0, tal
 * cual se tecleó (espacios aparte), o `null`. Igual que las piezas, nunca se
 * reinterpreta: quitar la coma convertía "3,50" en 350.
 */
export const linePrice = (l: SalidaMaquilaDraftLine): number | null => {
  const text = l.precio.trim();
  return PRICE.test(text) && Number(text) > 0 ? Number(text) : null;
};

/** ¿Hay algo escrito en precio que no es un precio válido (> 0)? */
export const hasInvalidPrice = (l: SalidaMaquilaDraftLine): boolean =>
  l.precio.trim() !== "" && linePrice(l) === null;

export const lineImporte = (l: SalidaMaquilaDraftLine): number => lineQty(l) * (linePrice(l) ?? 0);

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
  if (lines.some((l) => (lineQty(l) > 0 && linePrice(l) === null) || hasInvalidPrice(l))) {
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
 * Un `switch` por origen y no una clave calculada: así el compilador revisa
 * cada variante contra el contrato del alta.
 */
export const toDetalles = (
  lines: SalidaMaquilaDraftLine[],
  origen: SalidaMaquilaOrigen,
): CreateSalidaMaquilaDetalle[] =>
  linesToSend(lines).map((l) => {
    // Sin `descripcion` cuando la nombra mejor el backend (muestra, EC-964): la
    // que manda el cliente gana sobre la suya.
    const base = {
      ...(l.descripcionDelServidor ? {} : { descripcion: l.descripcion }),
      cantidad: String(lineQty(l)),
      precio_unitario: l.precio.trim(),
    };
    switch (origen) {
      case "OP":
        return { op_detalle: l.detalleId, ...base };
      case "OB":
        return { ob_detalle: l.detalleId, ...base };
      case "OR":
        return { or_detalle: l.detalleId, ...base };
    }
  });

/** Cuerpo del alta con exactamente uno de `op`, `ob` u `orden_r`, según el origen. */
export const buildCreateSalidaMaquilaBody = (
  origen: SalidaMaquilaOrigen,
  ordenId: number,
  rest: Omit<CreateSalidaMaquilaBody, "op" | "ob" | "orden_r">,
): CreateSalidaMaquilaBody => {
  switch (origen) {
    case "OP":
      return { op: ordenId, ...rest };
    case "OB":
      return { ob: ordenId, ...rest };
    case "OR":
      return { orden_r: ordenId, ...rest };
  }
};
