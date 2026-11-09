/**
 * `GET /terceros/clientes/kpis/`: indicadores de clientes que CALCULA el
 * backend en cada lectura. Aquí no se recalcula nada; la UI pinta los valores
 * tal cual.
 *
 * Todo se acota a la empresa ACTIVA del usuario, superusuario incluido
 * (EC-798). Dentro de ella hay dos alcances:
 * - Clientes (`clientes_activos`, `clientes_nuevos`): superusuario, admin de
 *   empresa, Mesa de Control y Contabilidad cuentan todos los clientes de la
 *   empresa; el resto, solo los que tiene asignados.
 * - Facturación y cartera (`ventas_por_cliente`, `cartera_antiguedad`, EC-789):
 *   todos los clientes de la empresa solo con `puede_ver_cartera_de_todos`
 *   (superusuario, admin de empresa y Contabilidad); el resto, Mesa de Control
 *   incluida, solo sus clientes asignados. No se omite ningún importe: cambia
 *   el conjunto de clientes sobre el que se suman.
 * El endpoint no acepta parámetros (cualquiera responde 400) y no expone metas
 * ni semáforo.
 *
 * Cada bloque es una unión discriminada sobre `disponible`: CUALQUIERA de los
 * cinco puede llegar como `{ disponible: false, motivo }` (un usuario sin
 * empresa recibe los cinco así, y sin `puede_ver_cartera_de_todos`). La UI
 * decide solo por esa bandera.
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

/**
 * Clientes activos dados de alta en el mes calendario en curso, en hora del
 * centro de México (EC-817). Solo un conteo: sin importes ni drill-down. Los
 * clientes sin fecha de alta (anteriores al historial) no cuentan en ningún mes.
 */
export interface CustomerNewKpiAvailable {
  disponible: true;
  /** Regla del backend en texto. */
  criterio: string;
  total: number;
  /** Mes que se cuenta, "YYYY-MM". */
  mes: string;
  /**
   * Primer y último día del mes, "YYYY-MM-DD", ambos inclusivos. Fechas-calendario:
   * no pasarlas por `new Date()`, que las lee como medianoche UTC y en México
   * caen en el día anterior.
   */
  desde: string;
  hasta: string;
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
export type CustomerNewKpi = CustomerNewKpiAvailable | CustomerKpiUnavailable;
export type CustomerCarteraKpi = CustomerCarteraKpiAvailable | CustomerKpiUnavailable;

export interface CustomerKpis {
  /** Datetime UTC del cálculo. */
  generado_en: string;
  /**
   * `true`: facturación y cartera cubren todos los clientes de la empresa;
   * `false`: solo los asignados al usuario (EC-789). AUSENTE si el usuario no
   * tiene empresa (todos los bloques llegan no disponibles).
   */
  puede_ver_cartera_de_todos?: boolean;
  ventas_por_cliente: CustomerSalesKpi;
  clientes_activos: CustomerActiveKpi;
  clientes_nuevos: CustomerNewKpi;
  /**
   * Hoy SIEMPRE llega no disponible. Su forma disponible aún no existe en el
   * contrato: solo se tipa la bandera (el bloque genérico de `KpiGrid`).
   */
  reclamos_devoluciones: KpiUntypedBlock;
  cartera_antiguedad: CustomerCarteraKpi;
}
