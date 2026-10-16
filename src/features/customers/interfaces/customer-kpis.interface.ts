/**
 * `GET /terceros/clientes/kpis/`: indicadores de clientes que CALCULA el
 * backend en cada lectura. Aquí no se recalcula nada; la UI pinta los valores
 * tal cual.
 *
 * El alcance depende del ROL (superusuario: todas las empresas; admin de
 * empresa o Mesa de Control: toda su empresa; el resto: los clientes que tiene
 * asignados), así que no siempre son "los clientes del usuario". El endpoint
 * no acepta parámetros (cualquiera responde 400) y no expone metas ni semáforo.
 *
 * Cada bloque es una unión discriminada sobre `disponible`: CUALQUIERA de los
 * cuatro puede llegar como `{ disponible: false, motivo }` (p. ej. un usuario
 * sin empresa recibe los cuatro así). La UI decide solo por esa bandera.
 *
 * Importes POR MONEDA (`por_moneda`): solo vienen las monedas con datos, por
 * código ISO en orden alfabético, y `[]` sin datos. No hay ningún total de
 * importes entre monedas; solo los conteos cruzan monedas. Los importes son
 * NÚMEROS JSON (`Decimal` que el encoder de DRF serializa como float).
 */

import type { KpiUntypedBlock } from "@/src/components/KpiGrid";

/** Bloque que la fuente no puede calcular; `motivo` es texto para el usuario. */
export interface CustomerKpiUnavailable {
  disponible: false;
  motivo: string;
}

/** Cliente del top de facturación de UNA moneda. */
export interface CustomerKpiTopCliente {
  cliente_id: number;
  cliente_nombre: string;
  monto: number;
  /** 0–100 con 1 decimal, sobre el total de SU moneda (un monto pequeño llega como 0.0). */
  pct_del_total: number;
  /** 0–100 con 1 decimal, acumulado hasta esta fila dentro de su moneda. */
  pct_acumulado: number;
}

/** Facturación de una moneda. */
export interface CustomerSalesKpiMoneda {
  /** Código ISO 4217 ("MXN", "USD"). */
  moneda: string;
  total_facturado: number;
  /** Clientes con facturación en ESTA moneda (uno con MXN y USD cuenta en ambas). */
  total_clientes_facturados: number;
  /** Como MÁXIMO 5, ordenados por `monto` desc. */
  top_clientes: CustomerKpiTopCliente[];
}

export interface CustomerSalesKpiAvailable {
  disponible: true;
  /** Regla del backend en texto ("Facturas Emitidas y activas."). */
  criterio: string;
  por_moneda: CustomerSalesKpiMoneda[];
}

/** Cliente de las listas de activos/inactivos. */
export interface CustomerKpiClienteRef {
  cliente_id: number;
  cliente_nombre: string;
}

export interface CustomerActiveKpiAvailable {
  disponible: true;
  /** Regla del backend en texto (no dice el largo de la ventana). */
  criterio: string;
  total: number;
  activos: number;
  inactivos: number;
  /** 0–100 con 1 decimal; `null` cuando `total` es 0 (nunca se pinta "0%"). */
  pct_activos: number | null;
  /**
   * Ventana de actividad: activo = con algún pedido Por autorizar, Autorizado o
   * En proceso creado en estos últimos días.
   */
  ventana_dias: number;
  drill_down: {
    /** Como MÁXIMO 20, ordenados por nombre; el total real es `activos`. */
    activos: CustomerKpiClienteRef[];
    /** Como MÁXIMO 20, ordenados por nombre; el total real es `inactivos`. */
    inactivos: CustomerKpiClienteRef[];
    activos_truncado: boolean;
    inactivos_truncado: boolean;
  };
}

/** Cuentas vencidas de un tramo de días: conteo y suma de saldo. */
export interface CustomerKpiCarteraBucket {
  total: number;
  monto: number;
}

/** Saldo vencido de una moneda. */
export interface CustomerCarteraKpiMoneda {
  moneda: string;
  saldo_total_vencido: number;
  total_cuentas_vencidas: number;
  /** Días vencida: `0_30` = 1–30, `31_60` = 31–60, `60_mas` = 61 o más. */
  buckets: {
    "0_30": CustomerKpiCarteraBucket;
    "31_60": CustomerKpiCarteraBucket;
    "60_mas": CustomerKpiCarteraBucket;
  };
}

/** Saldo vivo SIN fecha de vencimiento de una moneda: no cuenta como vencido. */
export interface CustomerCarteraSinVencimiento {
  moneda: string;
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
  /** Moneda de la factura de la CxC. */
  moneda: string;
  /** Fecha-calendario "YYYY-MM-DD" (sin hora). */
  fecha_vencimiento: string;
  dias_vencida: number;
}

export interface CustomerCarteraKpiAvailable {
  disponible: true;
  /** Conteo de TODAS las monedas (un conteo sí se puede sumar). */
  total_cuentas_vencidas: number;
  por_moneda: CustomerCarteraKpiMoneda[];
  sin_vencimiento: CustomerCarteraSinVencimiento[];
  /** Como MÁXIMO 20 filas de todas las monedas, por `fecha_vencimiento` asc. */
  drill_down: CustomerKpiCuentaVencida[];
  /** Total real de cuentas vencidas (igual a `total_cuentas_vencidas`). */
  drill_down_total: number;
  drill_down_truncado: boolean;
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
