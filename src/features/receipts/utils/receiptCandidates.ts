import { SALIDA_MAQUILA_ORIGENES } from "@/src/features/maquila-outputs/constants/salidaMaquilaOrigen";
import type {
  ReceiptOnboardingOrderDetalleBase,
  ReceiptOnboardingProductionOrder,
  ReceiptOnboardingSalidaMaquila,
  ReceiptOnboardingSearch,
  ReceiptOrderCandidate,
} from "../interfaces/receipt-onboarding.interface";
import { pendienteRecepcion } from "./receiptQuantities";

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

/**
 * "Faltan 6 de 10 pzas" de una SM en el selector (EC-919): con recepciones
 * parciales, cuánto le queda por regresar. `null` si el backend no manda
 * `piezas_pendientes` o no es un número.
 */
export const salidaMaquilaPendienteTexto = (
  salida: Pick<ReceiptOnboardingSalidaMaquila, "piezas_pendientes" | "total_piezas">,
): string | null => {
  if (salida.piezas_pendientes === undefined || salida.piezas_pendientes === null) return null;
  const pendientes = Number(salida.piezas_pendientes);
  if (!Number.isFinite(pendientes)) return null;
  const total = Number(salida.total_piezas);
  const fmt = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 2 });
  return Number.isFinite(total) && total > 0 && total !== pendientes
    ? `Faltan ${fmt(pendientes)} de ${fmt(total)} pzas`
    : `${fmt(pendientes)} pzas por regresar`;
};

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

/**
 * Renglones del candidato con la forma base del detalle: los de la OC/OP, o
 * los de la SM de OB/OR normalizados (EC-912).
 */
export const candidateDetalle = (candidate: ReceiptOrderCandidate): ReceiptOnboardingOrderDetalleBase[] =>
  candidate.type === "salida-maquila"
    ? (candidate.salidaMaquila.detalle ?? []).map((r) => ({
        id: r.id,
        producto_id: 0,
        producto_nombre: r.producto_nombre ?? "",
        cantidad_ordenada: r.cantidad,
        cantidad_recibida: r.cantidad_recibida,
        cantidad_pendiente: r.cantidad_pendiente,
        descripcion: r.descripcion,
        sku: r.sku,
      }))
    : candidate.order.detalle;

/**
 * Pendiente de un renglón que aplica a ESTA recepción (EC-919):
 *  - SM de OP: el de esa SM en el renglón (`salidas_maquila`, nucleo-erp
 *    #1268). Un renglón sin la SM (o sin `salidas_maquila`) no se puede
 *    recibir con ella: "0". Su `cantidad_pendiente` es lo de la OP DIRECTA.
 *  - OP directa: `cantidad_pendiente`, que ya descuenta las piezas en maquila.
 *  - SM de OB/OR: el pendiente de su propio renglón.
 */
export const candidateLinePendiente = (
  candidate: ReceiptOrderCandidate,
  d: ReceiptOnboardingOrderDetalleBase,
): string => {
  const smDeOp = candidate.type === "produccion" ? candidate.salidaMaquila : null;
  if (!smDeOp) return d.cantidad_pendiente;
  return d.salidas_maquila?.find((sm) => sm.id === smDeOp.id)?.cantidad_pendiente ?? "0";
};

/** ¿El renglón no va en la SM de OP que se recibe? */
export const candidateLineFueraDeSm = (
  candidate: ReceiptOrderCandidate,
  d: ReceiptOnboardingOrderDetalleBase,
): boolean => {
  const smDeOp = candidate.type === "produccion" ? candidate.salidaMaquila : null;
  return Boolean(smDeOp && !d.salidas_maquila?.some((sm) => sm.id === smDeOp.id));
};

/**
 * Techo por id de renglón: lo pendiente EXACTO que aplica a esta recepción
 * (EC-900, hasta 4 decimales). La captura manual se topa aparte en enteros
 * (`topeManualRecepcion`).
 */
export const candidateLineTopes = (candidate: ReceiptOrderCandidate): Map<number, number> =>
  new Map(candidateDetalle(candidate).map((d) => [d.id, pendienteRecepcion(candidateLinePendiente(candidate, d))]));

/**
 * El mismo candidato armado con datos frescos del onboarding (EC-919): tras un
 * 400 por renglón, los topes y el resumen salen de lo que el backend dice
 * ahora. `null` si la orden o la SM ya no aparecen (se completó, se canceló o
 * dejó de ser recibible): no hay con qué seguir.
 */
export const refreshCandidate = (
  candidate: ReceiptOrderCandidate,
  busqueda: ReceiptOnboardingSearch,
): ReceiptOrderCandidate | null => {
  const sm = (id: number) => busqueda.salidas_maquila?.find((s) => s.id === id) ?? null;
  switch (candidate.type) {
    case "compra": {
      const order = busqueda.ordenes_compra.find((o) => o.id === candidate.order.id);
      return order ? { type: "compra", order } : null;
    }
    case "produccion": {
      const order = busqueda.ordenes_produccion.find((o) => o.id === candidate.order.id);
      if (!order) return null;
      if (!candidate.salidaMaquila) return { type: "produccion", order, salidaMaquila: null };
      const salidaMaquila = sm(candidate.salidaMaquila.id);
      return salidaMaquila ? { type: "produccion", order, salidaMaquila } : null;
    }
    case "salida-maquila": {
      const salidaMaquila = sm(candidate.salidaMaquila.id);
      return salidaMaquila ? { type: "salida-maquila", salidaMaquila } : null;
    }
  }
};

/**
 * Qué le pasa a la SM con esta recepción, para el resumen del formulario
 * (EC-919). Sin nada capturado no se dice nada; si regresa todo, o falta algo
 * pero se marca "Cerrar la SM con faltante" (`cerrar_salida_maquila`), queda
 * Recibida; si falta algo y no se cierra, sigue Enviada.
 */
export const salidaMaquilaDesenlace = ({
  capturadas,
  pendientes,
  cerrar,
}: {
  capturadas: number;
  pendientes: number;
  cerrar: boolean;
}): "nada" | "sigue-enviada" | "recibida-con-faltante" | "recibida" => {
  if (capturadas <= 0) return "nada";
  if (capturadas >= pendientes) return "recibida";
  return cerrar ? "recibida-con-faltante" : "sigue-enviada";
};
