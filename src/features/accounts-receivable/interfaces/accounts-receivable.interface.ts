// Modelo de dominio de Cuentas por Cobrar (CxC), alineado con el contrato del
// backend `GET /finanzas/cuentas-por-cobrar/`. Los nombres en español de las
// llaves se conservan tal cual del API — no traducir. Los importes llegan como
// strings decimales ("1160.00") y las fechas como strings ISO; la vista los
// parsea con los helpers de `utils/` para calcular KPIs, antigüedad y días de
// atraso.

/**
 * Estatus posibles de una cuenta por cobrar (valores exactos del backend).
 * `StatusBadge` degrada con un estilo por defecto si llegara un valor no listado.
 */
export type CxCEstatus =
  | "Pendiente"
  | "Parcial"
  | "Pagada"
  | "Cancelada"
  | "Vencida";

/** Elemento de la respuesta de `GET /finanzas/cuentas-por-cobrar/`. */
export interface CuentaPorCobrar {
  id: number;
  cliente: number;
  cliente_nombre: string;
  factura_id: number;
  factura_folio: string;
  moneda_id: number;
  moneda_codigo: string;
  /** Fecha ISO `YYYY-MM-DD`. */
  fecha_emision: string;
  /** Fecha ISO `YYYY-MM-DD`. */
  fecha_vencimiento: string;
  /** Importe total de la factura (string decimal). */
  total: string;
  /** Saldo pendiente por cobrar (string decimal). */
  saldo: string;
  estatus: CxCEstatus;
  referencia: string;
  /** Timestamp ISO del último pago, o `null` si aún no hay cobros. */
  fecha_ultimo_pago: string | null;
  observaciones: string;
  created_at: string;
  updated_at: string;
}

/**
 * Parámetros de consulta (todos opcionales) de `GET /finanzas/cuentas-por-cobrar/`.
 * Axios omite las llaves `undefined`, así que solo se envían las que se fijan.
 * Nota: hoy la tabla filtra en cliente (ver `useCuentasPorCobrar`), por lo que
 * estos parámetros quedan disponibles para uso futuro sin que la UI los dispare.
 */
export interface CuentaPorCobrarQueryParams {
  cliente?: number;
  cliente_id?: number;
  estatus?: CxCEstatus;
  /** `true` → solo cuentas con `saldo > 0`. */
  saldo_pendiente?: boolean;
  /** `true` → solo cuentas vencidas con saldo pendiente. */
  vencidas?: boolean;
}

/**
 * Fila de la tabla de CxC: la cuenta del backend enriquecida con los campos
 * derivados que solo existen en la vista —un folio legible formateado a partir
 * del `id` (el backend no expone folio propio de la CxC) y los días de atraso
 * calculados contra "hoy"—.
 */
export interface CuentaPorCobrarRow extends CuentaPorCobrar {
  /** Folio de presentación derivado del `id` real (p. ej. `CXC-00022`). */
  folio_cxc: string;
  /** Días de atraso (`hoy − fecha_vencimiento`), 0 si aún no vence. */
  dias_vencido: number;
  /**
   * ¿La cuenta está vencida según la definición única `isCuentaVencida`
   * (saldo abierto, no Pagada/Cancelada y vencimiento ya pasado)? Es el mismo
   * criterio que alimenta el KPI "Vencido", la antigüedad y la alerta, de modo
   * que la fila nunca contradice a los agregados.
   */
  esta_vencida: boolean;
}

/** KPIs derivados que alimentan las tarjetas del encabezado. */
export interface CxCKpis {
  /** Suma de `saldo` de todas las cuentas (las de saldo 0 no aportan). */
  totalPorCobrar: number;
  /** Suma de `saldo` de las cuentas vencidas (ver `isCuentaVencida`). */
  totalVencido: number;
  /** Suma de `saldo` de las cuentas por vencer en los próximos 30 días. */
  porVencer30: number;
  /** Aproximación del cobrado en el mes en curso (ver `computeCxcKpis`). */
  cobradoEsteMes: number;
  /** Número de cuentas vencidas (ver `isCuentaVencida`). */
  cuentasVencidas: number;
}

/** Rango de antigüedad de saldos vencidos. */
export interface AgingBucket {
  key: string;
  label: string;
  count: number;
  amount: number;
}
