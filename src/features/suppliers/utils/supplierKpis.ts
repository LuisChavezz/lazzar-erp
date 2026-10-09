import type { SupplierKpiRow } from "../interfaces/supplier-kpis.interface";

/**
 * Agregados de las tarjetas de indicadores de proveedores (EC-436). El backend
 * devuelve un ranking por proveedor; las tarjetas suman sus CONTEOS (no
 * promedian porcentajes). Funciones puras: no reinterpretan ninguna regla del
 * backend.
 *
 * Ojo: el payload trae como máximo 50 proveedores, así que con más actividad
 * estos totales cubren solo esas filas.
 */

/** Porcentaje 0–100 redondeado a 1 decimal, como los que manda el backend. */
const pct = (numerador: number, denominador: number): number =>
  Math.round((numerador / denominador) * 1000) / 10;

const sum = (rows: SupplierKpiRow[], pick: (row: SupplierKpiRow) => number): number =>
  rows.reduce((total, row) => total + pick(row), 0);

/**
 * Entrega a tiempo: Σ recepciones a tiempo / Σ recepciones. `pct: null` sin
 * recepciones.
 */
export function aggregateOnTimeDelivery(rows: SupplierKpiRow[]) {
  const aTiempo = sum(rows, (row) => row.entrega_a_tiempo.recepciones_a_tiempo);
  const total = sum(rows, (row) => row.entrega_a_tiempo.recepciones_total);
  return { pct: total > 0 ? pct(aTiempo, total) : null, aTiempo, total };
}

/**
 * Calidad: Σ rechazado / Σ inspeccionado. `pct: null` sin cantidad
 * inspeccionada.
 */
export function aggregateQuality(rows: SupplierKpiRow[]) {
  const rechazada = sum(rows, (row) => row.calidad.cantidad_rechazada);
  const inspeccionada = sum(rows, (row) => row.calidad.cantidad_inspeccionada);
  return { pct: inspeccionada > 0 ? pct(rechazada, inspeccionada) : null, rechazada, inspeccionada };
}

/**
 * Lead time real: promedio de `dias_promedio_real` ponderado por
 * `recepciones_total` (las recepciones sobre las que el backend lo promedió).
 * Las filas con `dias_promedio_real: null` quedan fuera del numerador Y del
 * peso. `dias: null` si no queda ninguna recepción.
 *
 * No agrega `dias_promedio_pactado`: no se sabe sobre qué recepciones lo
 * promedia el backend (#388). Solo informa si alguna fila lo trae.
 */
export function aggregateLeadTime(rows: SupplierKpiRow[]) {
  const conReal = rows.filter((row) => row.lead_time.dias_promedio_real !== null);
  const recepciones = sum(conReal, (row) => row.entrega_a_tiempo.recepciones_total);
  const ponderado = sum(
    conReal,
    (row) => (row.lead_time.dias_promedio_real ?? 0) * row.entrega_a_tiempo.recepciones_total,
  );
  return {
    dias: recepciones > 0 ? Math.round((ponderado / recepciones) * 10) / 10 : null,
    recepciones,
    hasPactado: hasAgreedLeadTime(rows),
  };
}

/** Scorecard: cuántos proveedores están en verde entre los que tienen semáforo. */
export function aggregateScorecard(rows: SupplierKpiRow[]) {
  const evaluados = rows.filter((row) => row.scorecard.semaforo !== "sin_datos");
  const enVerde = evaluados.filter((row) => row.scorecard.semaforo === "verde").length;
  return { enVerde, evaluados: evaluados.length };
}

/**
 * ¿Alguna fila trae lead time pactado? Hoy ninguna OC tiene
 * `fecha_entrega_estimada` (#387/#388): sin ella el backend cuenta toda
 * recepción como tardía y arrastra el scorecard. Mientras sea `false`,
 * "Entrega a tiempo" y "Scorecard general" se muestran no disponibles; se
 * encienden solas en cuanto alguna fila lo traiga.
 */
export const hasAgreedLeadTime = (rows: SupplierKpiRow[]): boolean =>
  rows.some((row) => row.lead_time.dias_promedio_pactado !== null);
