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
 * Entrega a tiempo: Σ recepciones a tiempo / Σ recepciones con fecha prometida,
 * igual que el `pct` que el backend da por proveedor. Las recepciones sin fecha
 * prometida no cuentan (no se puede saber si llegaron tarde). `pct: null` si
 * ninguna tiene fecha prometida.
 */
export function aggregateOnTimeDelivery(rows: SupplierKpiRow[]) {
  const aTiempo = sum(rows, (row) => row.entrega_a_tiempo.recepciones_a_tiempo);
  const total = sum(rows, (row) => row.entrega_a_tiempo.recepciones_con_compromiso);
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
 * `lead_time.recepciones_medidas`, las recepciones sobre las que el backend lo
 * promedió (las que tienen fecha prometida). Así da el mismo promedio por
 * recepción que el backend calcula por proveedor. Las filas sin recepciones
 * medidas (`dias_promedio_real: null`) no aportan. `dias: null` si no queda
 * ninguna recepción.
 */
export function aggregateLeadTime(rows: SupplierKpiRow[]) {
  const recepciones = sum(rows, (row) => row.lead_time.recepciones_medidas);
  const ponderado = sum(
    rows,
    (row) => (row.lead_time.dias_promedio_real ?? 0) * row.lead_time.recepciones_medidas,
  );
  return {
    dias: recepciones > 0 ? Math.round((ponderado / recepciones) * 10) / 10 : null,
    recepciones,
  };
}

/**
 * Scorecard: cuántos proveedores están en verde entre los que tienen semáforo
 * (`sin_datos` = ningún factor con dato). El backend promedia solo los
 * factores con dato, así que un proveedor sin fechas prometidas ya no arrastra
 * su puntaje por puntualidad: cuentan todos los evaluados.
 */
export function aggregateScorecard(rows: SupplierKpiRow[]) {
  const evaluados = rows.filter((row) => row.scorecard.semaforo !== "sin_datos");
  const enVerde = evaluados.filter((row) => row.scorecard.semaforo === "verde").length;
  return { enVerde, evaluados: evaluados.length };
}
