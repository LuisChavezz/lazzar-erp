// Funciones puras de derivación para los KPIs del listado de Packing. Operan
// sobre `Packing[]` ya cargado por `usePackings()` — sin fetch propio, mismo
// espíritu que `computePickingKpis` (picking) / `computeCxcKpis`
// (accounts-receivable).

import { safeParseAmount } from "@/src/utils/formatCurrency";
import type { Packing } from "../interfaces/packing.interface";

export interface PackingKpis {
  /**
   * Conteo de líneas de `packing_detalle` a través de todos los packings.
   * NO se filtra por `cantidad_empacada > 0` porque, por contrato del flujo de
   * creación (ver `usePackingStep2Form.buildLines`), NINGUNA línea con
   * cantidad vacía/cero llega a enviarse: el wizard descarta toda fila cuyo
   * valor normalizado quede por debajo de `PACKING_MIN_CANTIDAD` antes de
   * construir el payload. Es decir, toda línea que exista en
   * `packing_detalle` YA representa actividad real de empaque — contar el
   * arreglo completo y filtrar por cantidad son, en la práctica, la MISMA
   * cifra. Se filtra de todos modos (en vez de un `.length` directo) como
   * defensa ante datos que no pasaron por este wizard (p.ej. un alta futura
   * por admin/API que no respete la misma invariante).
   */
  totalLineasEmpacadas: number;
  /** Suma de `numero_cajas` a través de todos los packings. */
  totalCajas: number;
  /** Suma de `peso_total` (kg, `decimal_places=3`) a través de todos los packings. */
  pesoTotal: number;
  /** Suma de `volumen_total` (m³, `decimal_places=3`) a través de todos los packings. */
  volumenTotal: number;
}

export const computePackingKpis = (packings: Packing[]): PackingKpis => {
  let totalLineasEmpacadas = 0;
  let totalCajas = 0;
  let pesoTotal = 0;
  let volumenTotal = 0;

  for (const packing of packings) {
    totalLineasEmpacadas += packing.packing_detalle.filter(
      (linea) => safeParseAmount(linea.cantidad_empacada) > 0,
    ).length;
    totalCajas += packing.numero_cajas;
    pesoTotal += safeParseAmount(packing.peso_total);
    volumenTotal += safeParseAmount(packing.volumen_total);
  }

  return {
    totalLineasEmpacadas,
    totalCajas,
    pesoTotal,
    volumenTotal,
  };
};
