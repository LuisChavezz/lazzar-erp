/**
 * `GET /terceros/clientes/kpis/`: indicadores de clientes que CALCULA el
 * backend en cada lectura. Aquí no se recalcula nada; la UI pinta los valores
 * tal cual.
 *
 * El alcance depende del ROL (superusuario: todas las empresas; admin de
 * empresa o Mesa de Control: toda su empresa; el resto: los clientes que tiene
 * asignados), así que no siempre son "los clientes del usuario". El endpoint
 * no acepta parámetros (cualquiera se ignora) y no expone metas ni semáforo.
 *
 * Cada bloque es una unión discriminada sobre `disponible`: CUALQUIERA de los
 * cuatro puede llegar como `{ disponible: false, motivo }` (p. ej. un usuario
 * sin empresa recibe los cuatro así). La UI decide solo por esa bandera.
 *
 * Todos los importes son NÚMEROS JSON sin `moneda` y suman monedas distintas
 * sin convertir (defecto conocido del backend): se pintan sin símbolo.
 */

import type { KpiUntypedBlock } from "@/src/components/KpiGrid";

/** Bloque que la fuente no puede calcular; `motivo` es texto para el usuario. */
export interface CustomerKpiUnavailable {
  disponible: false;
  motivo: string;
}

/** Cliente del top de facturación. */
export interface CustomerKpiTopCliente {
  cliente_id: number;
  cliente_nombre: string;
  monto: number;
  /** 0–100 con 1 decimal (un monto pequeño llega como 0.0). */
  pct_del_total: number;
  /** 0–100 con 1 decimal, acumulado hasta esta fila. */
  pct_acumulado: number;
}

export interface CustomerSalesKpiAvailable {
  disponible: true;
  total_facturado: number;
  total_clientes_facturados: number;
  /** Como MÁXIMO 5, ordenados por `monto` desc; puede venir vacío. */
  top_clientes: CustomerKpiTopCliente[];
}

export interface CustomerActiveKpiAvailable {
  disponible: true;
  total: number;
  activos: number;
  inactivos: number;
  /** 0–100 con 1 decimal; `null` cuando `total` es 0 (nunca se pinta "0%"). */
  pct_activos: number | null;
  /** Ventana de actividad: activo = con algún pedido en estos últimos días. */
  ventana_dias: number;
}

/** Cuentas vencidas de un tramo de días: conteo y suma de saldo. */
export interface CustomerKpiCarteraBucket {
  total: number;
  monto: number;
}

/** Cuenta por cobrar vencida del drill-down. */
export interface CustomerKpiCuentaVencida {
  /** PK de la CxC: el frontend no tiene ruta de detalle para ella. */
  id: number;
  cliente_id: number;
  /** Así, con doble guion bajo, en el payload (a diferencia de `cliente_nombre` del top). */
  cliente__nombre: string;
  saldo: number;
  /** Fecha-calendario "YYYY-MM-DD" (sin hora). */
  fecha_vencimiento: string;
  dias_vencida: number;
}

export interface CustomerCarteraKpiAvailable {
  disponible: true;
  saldo_total_vencido: number;
  total_cuentas_vencidas: number;
  /** Días vencida: `0_30` = 1–30, `31_60` = 31–60, `60_mas` = 61 o más. */
  buckets: {
    "0_30": CustomerKpiCarteraBucket;
    "31_60": CustomerKpiCarteraBucket;
    "60_mas": CustomerKpiCarteraBucket;
  };
  /**
   * Como MÁXIMO 20 filas, ordenadas por `fecha_vencimiento` asc, sin
   * paginación; el total real es `total_cuentas_vencidas`.
   */
  drill_down: CustomerKpiCuentaVencida[];
}

export type CustomerSalesKpi = CustomerSalesKpiAvailable | CustomerKpiUnavailable;
export type CustomerActiveKpi = CustomerActiveKpiAvailable | CustomerKpiUnavailable;
export type CustomerCarteraKpi = CustomerCarteraKpiAvailable | CustomerKpiUnavailable;

export interface CustomerKpis {
  /** Datetime UTC del cálculo. */
  generado_en: string;
  ventas_por_cliente: CustomerSalesKpi;
  clientes_activos: CustomerActiveKpi;
  /**
   * Hoy SIEMPRE llega no disponible. Su forma disponible aún no existe en el
   * contrato: solo se tipa la bandera (el bloque genérico de `KpiGrid`).
   */
  reclamos_devoluciones: KpiUntypedBlock;
  cartera_antiguedad: CustomerCarteraKpi;
}
