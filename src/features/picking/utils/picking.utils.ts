// Funciones puras de derivación para los KPIs del listado de Picking. Operan
// sobre `Picking[]` ya cargado por `usePickings()` — sin fetch propio, mismo
// espíritu que `computeCxcKpis` (accounts-receivable).

import type {
  Picking,
  PickingPrioridad,
  PickingRow,
} from "../interfaces/picking.interface";

/**
 * DEFINICIÓN ÚNICA DE "PICKING VENCIDO", compartida por la columna "Fecha
 * Límite" y el filtro "Vencido" del listado. Si cambia, cambia aquí.
 *
 * Un picking está vencido cuando cumple LAS DOS:
 *   1. no está `Completado` ni `Cancelado` (estados terminales: un picking ya
 *      surtido o cancelado no representa trabajo atrasado), y
 *   2. su `fecha_limite` ya pasó. Una `fecha_limite` nula o inválida NO se
 *      marca vencida.
 *
 * Se compara contra el INSTANTE actual, no contra la medianoche del día como
 * en cuentas por cobrar: ahí `fecha_vencimiento` es un `YYYY-MM-DD` (día
 * completo) mientras que aquí `fecha_limite` es un `date-time` con hora, así
 * que la hora del corte es parte del dato y anclarla a medianoche daría por
 * vigente un picking cuya hora límite ya pasó.
 *
 * Se deriva en el cliente porque el backend no expone ninguna bandera de
 * vencimiento calculada (verificado contra el schema OpenAPI del API: el
 * componente `Picking` solo trae `fecha_limite` cruda), igual que
 * `isCuentaVencida` en cuentas por cobrar.
 */
export const isPickingVencido = (picking: Picking, nowMs: number): boolean => {
  if (picking.estado === "Completado" || picking.estado === "Cancelado") return false;
  if (!picking.fecha_limite) return false;
  const limite = Date.parse(picking.fecha_limite);
  if (Number.isNaN(limite)) return false;
  return limite < nowMs;
};

/** Enriquece un picking con los campos derivados que consume la tabla. */
export const mapPickingToRow = (picking: Picking, nowMs: number): PickingRow => ({
  ...picking,
  esta_vencida: isPickingVencido(picking, nowMs),
});

/**
 * Mapea todo el listado contra un mismo "ahora", calculado UNA sola vez por la
 * vista, para que ninguna fila quede evaluada contra un instante distinto.
 */
export const mapPickingsToRows = (pickings: Picking[], nowMs: number): PickingRow[] =>
  pickings.map((picking) => mapPickingToRow(picking, nowMs));

export interface PickingKpis {
  /** Conteo simple del listado cargado. */
  totalPickings: number;
  /**
   * Suma de líneas AÚN NO surtidas (`total_lineas - total_lineas_completas`)
   * a través de todos los pickings — representa trabajo pendiente real, no el
   * total bruto de líneas (que incluiría lo ya completado). Cada término se
   * acota a `>= 0` por si algún registro llegara con `total_lineas_completas`
   * mayor a `total_lineas` (dato inconsistente del backend): un valor así
   * jamás debe restar al total en vez de sumar.
   */
  lineasPorSurtir: number;
  /** Conteo de pickings por `prioridad`. */
  prioridadBreakdown: Record<PickingPrioridad, number>;
}

export const computePickingKpis = (pickings: Picking[]): PickingKpis => {
  let lineasPorSurtir = 0;
  const prioridadBreakdown: Record<PickingPrioridad, number> = {
    BAJA: 0,
    MEDIA: 0,
    ALTA: 0,
  };

  for (const picking of pickings) {
    lineasPorSurtir += Math.max(0, picking.total_lineas - picking.total_lineas_completas);

    // `prioridad` ya viene tipada como `PickingPrioridad` (los 3 valores del
    // `TextChoices` del backend), pero eso es una promesa de compilación: la
    // guarda en runtime descarta silenciosamente cualquier valor fuera del
    // enum si el backend llegara a agregar uno, en vez de romper el conteo
    // —igual que `StatusBadge` degrada ante un `estado` desconocido—.
    if (picking.prioridad in prioridadBreakdown) {
      prioridadBreakdown[picking.prioridad] += 1;
    }
  }

  return {
    totalPickings: pickings.length,
    lineasPorSurtir,
    prioridadBreakdown,
  };
};
