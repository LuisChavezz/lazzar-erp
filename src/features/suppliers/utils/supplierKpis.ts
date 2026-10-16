import type { SupplierKpiRow, SupplierKpis } from "../interfaces/supplier-kpis.interface";

/**
 * Agregados de las tarjetas de indicadores de proveedores (EC-436). El backend
 * devuelve un ranking por proveedor; las tarjetas suman sus CONTEOS (no
 * promedian porcentajes). Funciones puras: no reinterpretan ninguna regla del
 * backend.
 *
 * Ojo: el payload trae como máximo `filtros.limite` proveedores (50 por
 * defecto); con `truncado` estos totales cubren solo esas filas (ver
 * `getSupplierKpiTruncationNote`).
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
 * Lead time real y pactado: promedios de `dias_promedio_real` y
 * `dias_promedio_pactado` ponderados por `lead_time.recepciones_medidas`. El
 * backend promedia AMBOS sobre esas mismas recepciones (las que tienen fecha
 * prometida y fecha de OC), así que los dos globales son el mismo promedio por
 * recepción y comparables entre sí. Las filas sin recepciones medidas (días en
 * `null`) no aportan. `dias`/`diasPactado: null` si no queda ninguna recepción.
 */
export function aggregateLeadTime(rows: SupplierKpiRow[]) {
  const recepciones = sum(rows, (row) => row.lead_time.recepciones_medidas);
  const weighted = (pick: (row: SupplierKpiRow) => number | null) => {
    const ponderado = sum(rows, (row) => (pick(row) ?? 0) * row.lead_time.recepciones_medidas);
    return recepciones > 0 ? Math.round((ponderado / recepciones) * 10) / 10 : null;
  };
  return {
    dias: weighted((row) => row.lead_time.dias_promedio_real),
    diasPactado: weighted((row) => row.lead_time.dias_promedio_pactado),
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

/**
 * Aviso de que el ranking llegó cortado (`truncado`): los agregados y los
 * desgloses cubren solo los proveedores que mandó el backend, no los
 * `total_proveedores`. `null` si llegaron todos. No dice con qué criterio se
 * eligieron: el backend ordena por un puntaje que incluye precio, y eso no se
 * revela a quien no puede ver importes.
 */
export function getSupplierKpiTruncationNote(data: SupplierKpis): string | null {
  if (!data.truncado) return null;
  return (
    `Calculado sobre ${data.proveedores.length} de ${data.total_proveedores} proveedores ` +
    "con actividad; el resto no entra."
  );
}
