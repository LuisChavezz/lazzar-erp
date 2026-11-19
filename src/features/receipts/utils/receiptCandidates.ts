import { SALIDA_MAQUILA_ORIGENES } from "@/src/features/maquila-outputs/constants/salidaMaquilaOrigen";
import type {
  ReceiptOnboardingProductionOrder,
  ReceiptOnboardingSalidaMaquila,
  ReceiptOrderCandidate,
} from "../interfaces/receipt-onboarding.interface";

/**
 * Fila de la pestaña "Orden de Producción" del paso 1 (EC-912): una OP o una
 * SM pendiente de recibir. La SM de OP lleva su OP resuelta desde
 * `ordenes_produccion` (`null` si no está ahí: no se puede recibir).
 */
export type ProductionTabRow =
  | { kind: "op"; order: ReceiptOnboardingProductionOrder }
  | {
      kind: "sm";
      salidaMaquila: ReceiptOnboardingSalidaMaquila;
      order: ReceiptOnboardingProductionOrder | null;
    };

/**
 * Llave única de una fila o candidato. Los ids de OP, OC y SM son de tablas
 * distintas y pueden coincidir: con el prefijo, la OP 12 y la SM 12 nunca se
 * toman por la misma fila.
 */
export const opRowKey = (opId: number) => `op-${opId}`;
export const smRowKey = (smId: number) => `sm-${smId}`;
export const ocRowKey = (ocId: number) => `oc-${ocId}`;

export const productionTabRowKey = (row: ProductionTabRow): string =>
  row.kind === "op" ? opRowKey(row.order.id) : smRowKey(row.salidaMaquila.id);

export const candidateKey = (candidate: ReceiptOrderCandidate): string => {
  switch (candidate.type) {
    case "compra":
      return ocRowKey(candidate.order.id);
    case "produccion":
      return candidate.salidaMaquila
        ? smRowKey(candidate.salidaMaquila.id)
        : opRowKey(candidate.order.id);
    case "salida-maquila":
      return smRowKey(candidate.salidaMaquila.id);
  }
};

/**
 * Sucursal cuyos almacenes acepta el backend: la de la OC/OP, o la de la SM
 * (OB/OR: "El almacén no pertenece a la sucursal de la SM").
 */
export const candidateSucursalId = (candidate: ReceiptOrderCandidate): number | null =>
  candidate.type === "salida-maquila"
    ? candidate.salidaMaquila.sucursal_id
    : candidate.order.sucursal_id;

/**
 * Subtítulo del diálogo "Nueva Recepción" según lo elegido: OC, OP o SM (la de
 * OP también es "Salida a Maquila"); neutro mientras no hay selección.
 */
export const receiptFlowSubtitle = (candidate: ReceiptOrderCandidate | null): string => {
  if (!candidate) return "Selecciona la orden a recibir";
  switch (candidate.type) {
    case "compra":
      return "Recepcionar Orden de Compra";
    case "produccion":
      return candidate.salidaMaquila ? "Recepcionar Salida a Maquila" : "Recepcionar Orden de Producción";
    case "salida-maquila":
      return "Recepcionar Salida a Maquila";
  }
};

/** ¿El flujo captura renglones? Solo la SM de OB/OR va sin ellos (`detalle: []`). */
export const candidateHasLines = (candidate: ReceiptOrderCandidate): boolean =>
  candidate.type !== "salida-maquila" || (candidate.salidaMaquila.detalle?.length ?? 0) > 0;

/** Filas de la pestaña: las OP tal cual y, después, las SM con su OP (si es de OP). */
export const buildProductionTabRows = (
  ordenes: readonly ReceiptOnboardingProductionOrder[],
  salidas: readonly ReceiptOnboardingSalidaMaquila[],
): ProductionTabRow[] => {
  const opsPorId = new Map(ordenes.map((op) => [op.id, op]));
  return [
    ...ordenes.map((order): ProductionTabRow => ({ kind: "op", order })),
    ...salidas.map(
      (salidaMaquila): ProductionTabRow => ({
        kind: "sm",
        salidaMaquila,
        order:
          salidaMaquila.origen === "OP" && salidaMaquila.op_id != null
            ? (opsPorId.get(salidaMaquila.op_id) ?? null)
            : null,
      }),
    ),
  ];
};

/**
 * Motivo por el que la fila no se puede elegir, o `null`. Solo pasa con una SM
 * de OP cuya OP no viene en `ordenes_produccion` (sin piezas pendientes o en un
 * estatus que no se recibe): sin la OP no hay renglones, y el backend la
 * rechazaría.
 */
export const productionTabRowDisabledReason = (row: ProductionTabRow): string | null =>
  row.kind === "sm" && row.salidaMaquila.origen === "OP" && row.order === null
    ? "Su OP no tiene piezas pendientes por recibir o no está disponible para recepción."
    : null;

/** Candidato que arranca el paso 2, o `null` si la fila no se puede recibir. */
export const productionTabRowCandidate = (row: ProductionTabRow): ReceiptOrderCandidate | null => {
  if (row.kind === "op") return { type: "produccion", order: row.order, salidaMaquila: null };
  if (row.salidaMaquila.origen !== "OP") {
    return { type: "salida-maquila", salidaMaquila: row.salidaMaquila };
  }
  return row.order ? { type: "produccion", order: row.order, salidaMaquila: row.salidaMaquila } : null;
};

/** "Bordado", "Reflejante" o "Producción": la etiqueta del origen sin su sigla. */
export const salidaMaquilaOrigenNombre = (salida: Pick<ReceiptOnboardingSalidaMaquila, "origen">): string =>
  SALIDA_MAQUILA_ORIGENES[salida.origen]?.nombreCorto ?? salida.origen;

/** Texto de búsqueda de una fila: folios (OP/SM/origen) y maquilero. */
export const productionTabRowMatches = (row: ProductionTabRow, term: string): boolean => {
  const campos =
    row.kind === "op"
      ? [row.order.folio]
      : [
          row.salidaMaquila.origen_folio,
          row.salidaMaquila.folio,
          row.salidaMaquila.folio_display,
          row.salidaMaquila.centro_confeccion_nombre,
          salidaMaquilaOrigenNombre(row.salidaMaquila),
        ];
  return campos.some((campo) => (campo ?? "").toLowerCase().includes(term));
};
