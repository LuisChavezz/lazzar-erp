// Funciones puras de derivación para Cuentas por Cobrar: mapeo de filas, KPIs y
// antigüedad de saldos. Operan sobre la respuesta del backend (`CuentaPorCobrar[]`)
// y NO consultan `new Date()` por su cuenta: reciben `todayUTC` para que la vista
// lo calcule UNA sola vez (con `startOfTodayUTC`) y lo comparta entre las tarjetas
// KPI, la antigüedad y la tabla, evitando desfaces si el render cruza medianoche.

import { safeParseAmount } from "@/src/utils/formatCurrency";
import type {
  AgingBucket,
  CuentaPorCobrar,
  CuentaPorCobrarRow,
  CxCKpis,
} from "../interfaces/accounts-receivable.interface";

const DIA_MS = 86_400_000;

/**
 * Timestamp de la medianoche UTC del día calendario actual. Se usa como "hoy"
 * de referencia porque las fechas del backend (`fecha_vencimiento`,
 * `fecha_emision`) son strings `YYYY-MM-DD` que `Date.parse` interpreta como
 * medianoche UTC; anclar "hoy" al mismo marco hace que la resta de días sea
 * exacta e independiente de la zona horaria del navegador.
 */
export const startOfTodayUTC = (): number => {
  const now = new Date();
  // Getters UTC (no locales): construimos la medianoche del día calendario UTC
  // real, no la del día calendario LOCAL del navegador. Así dos usuarios en
  // zonas distintas (p. ej. UTC+8 y UTC−8) obtienen el mismo "hoy" siempre que
  // la fecha UTC coincida, cumpliendo la independencia de zona que promete el
  // docstring (los `getFullYear`/`getMonth`/`getDate` locales la rompían).
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

/**
 * Días con signo desde hoy hasta el vencimiento: `> 0` faltan por vencer,
 * `= 0` vence hoy, `< 0` ya venció. Ambos extremos son medianoche UTC, así que
 * la división es un entero exacto. Devuelve 0 ante una fecha inválida.
 */
const daysUntilDue = (fechaVencimiento: string, todayUTC: number): number => {
  const venc = Date.parse(fechaVencimiento);
  if (Number.isNaN(venc)) return 0;
  return Math.round((venc - todayUTC) / DIA_MS);
};

/** Días de atraso (`hoy − vencimiento`), acotado a 0 cuando aún no vence. */
export const diasVencido = (
  fechaVencimiento: string,
  todayUTC: number,
): number => Math.max(0, -daysUntilDue(fechaVencimiento, todayUTC));

/**
 * DEFINICIÓN ÚNICA DE "VENCIDA" — fuente de verdad compartida por TODAS las
 * superficies de vencido: KPI "Vencido" (`totalVencido`/`cuentasVencidas`),
 * antigüedad de saldos, alerta (banner) y la columna "Días venc." de la tabla.
 * Ninguna superficie debe usar otro criterio; si cambia, cambia aquí.
 *
 * Una cuenta está vencida cuando cumple LAS TRES:
 *   1. conserva saldo abierto (`saldo > 0`),
 *   2. no está `Pagada` ni `Cancelada` (estados terminales que ya no
 *      representan dinero por cobrar), y
 *   3. su fecha de vencimiento es HOY o ya pasó (`fecha_vencimiento <= hoy` en
 *      medianoche UTC). Una cuenta que vence HOY ya cuenta como vencida con 0
 *      días de atraso —de ahí que el primer rango de antigüedad sea "0–30
 *      días"—; solo las de vencimiento FUTURO son "por vencer" (ver
 *      `porVencer30`). Una `fecha_vencimiento` inválida NO se marca vencida.
 *
 * Se deriva por FECHA en el cliente, NO por el `estatus` del backend. Motivos:
 *   • `estatus` es un enum de una sola dimensión: una cuenta no puede ser
 *     `Parcial` Y `Vencida` a la vez, así que una cuenta con abono parcial y ya
 *     vencida puede seguir leyéndose `Parcial`.
 *   • No hay garantía de que el backend marque `Vencida` en el instante en que
 *     `fecha_vencimiento` pasa (puede actualizarlo por lote/cron). Confiar en la
 *     fecha elimina el punto ciego de una cuenta ya vencida que el backend aún
 *     no marcó `Vencida` y que, de otro modo, desaparecería del KPI, la
 *     antigüedad y la alerta mientras sigue sumando a `totalPorCobrar`.
 * `estatus` se usa solo para descartar estados terminales (Pagada/Cancelada),
 * exactamente el rol que le queda bien.
 */
export const isCuentaVencida = (
  cuenta: CuentaPorCobrar,
  todayUTC: number,
): boolean => {
  if (cuenta.estatus === "Pagada" || cuenta.estatus === "Cancelada") return false;
  if (safeParseAmount(cuenta.saldo) <= 0) return false;
  const venc = Date.parse(cuenta.fecha_vencimiento);
  if (Number.isNaN(venc)) return false;
  return venc <= todayUTC;
};

/** Folio de presentación derivado del `id` real (el backend no expone folio de CxC). */
export const formatFolioCxc = (id: number): string =>
  `CXC-${String(id).padStart(5, "0")}`;

/** Enriquece una cuenta con los campos derivados que consume la tabla. */
export const mapCuentaToRow = (
  cuenta: CuentaPorCobrar,
  todayUTC: number,
): CuentaPorCobrarRow => ({
  ...cuenta,
  folio_cxc: formatFolioCxc(cuenta.id),
  dias_vencido: diasVencido(cuenta.fecha_vencimiento, todayUTC),
  // Mismo criterio (`isCuentaVencida`) que alimenta KPIs, antigüedad y alerta,
  // de modo que la fila y los agregados nunca se contradicen.
  esta_vencida: isCuentaVencida(cuenta, todayUTC),
});

/** Mapea toda la lista a filas de tabla contra un mismo "hoy". */
export const mapCuentasToRows = (
  cuentas: CuentaPorCobrar[],
  todayUTC: number,
): CuentaPorCobrarRow[] => cuentas.map((c) => mapCuentaToRow(c, todayUTC));

/** ¿El timestamp ISO cae en el mismo mes/año UTC que la referencia "hoy"? */
const esMismoMesUTC = (isoTimestamp: string, todayUTC: number): boolean => {
  const paid = Date.parse(isoTimestamp);
  if (Number.isNaN(paid)) return false;
  const p = new Date(paid);
  const t = new Date(todayUTC);
  return (
    p.getUTCFullYear() === t.getUTCFullYear() &&
    p.getUTCMonth() === t.getUTCMonth()
  );
};

/**
 * Calcula los KPIs del encabezado.
 *
 * - `totalPorCobrar`: suma de `saldo` de todas las cuentas (equivale a las de
 *   `saldo > 0`, semántica del filtro `saldo_pendiente=true` del backend; las
 *   Pagadas/Canceladas traen saldo 0 y no aportan).
 * - `totalVencido` / `cuentasVencidas`: cuentas vencidas según la definición
 *   ÚNICA `isCuentaVencida` (por fecha, no por `estatus`; ver su docstring). Es
 *   el mismo criterio que usan la antigüedad, la alerta y la columna de la
 *   tabla, así que todos los indicadores de vencido concuerdan.
 * - `porVencer30`: saldo abierto (`saldo > 0`) cuyo vencimiento cae entre MAÑANA
 *   y los próximos 30 días (`1 <= dias <= 30`). Es el complemento sin traslape
 *   de lo vencido: como una cuenta que vence HOY (`dias = 0`) ya es vencida, se
 *   excluye de "por vencer" para no contarla dos veces. Requiere aritmética de
 *   fechas (no hay estatus ni parámetro del backend equivalente).
 * - `cobradoEsteMes`: APROXIMACIÓN. La respuesta no trae historial de pagos,
 *   solo `fecha_ultimo_pago`, `total` y `saldo`. Para las cuentas cuyo último
 *   pago cae en el mes en curso se toma `total − saldo` como proxy del monto
 *   cobrado. Es exacto solo para cuentas de un único pago; en cuentas con pagos
 *   en varios meses sobreestima (imputa todo el abono al mes del último pago).
 */
export const computeCxcKpis = (
  cuentas: CuentaPorCobrar[],
  todayUTC: number,
): CxCKpis => {
  let totalPorCobrar = 0;
  let totalVencido = 0;
  let porVencer30 = 0;
  let cobradoEsteMes = 0;
  let cuentasVencidas = 0;

  for (const c of cuentas) {
    const saldo = safeParseAmount(c.saldo);
    totalPorCobrar += saldo;

    if (isCuentaVencida(c, todayUTC)) {
      totalVencido += saldo;
      cuentasVencidas += 1;
    }

    if (saldo > 0) {
      // 1..30: excluye lo que vence HOY (dias = 0), que ya cuenta como vencido.
      const dias = daysUntilDue(c.fecha_vencimiento, todayUTC);
      if (dias >= 1 && dias <= 30) porVencer30 += saldo;
    }

    if (c.fecha_ultimo_pago && esMismoMesUTC(c.fecha_ultimo_pago, todayUTC)) {
      const abonado = safeParseAmount(c.total) - saldo;
      if (abonado > 0) cobradoEsteMes += abonado;
    }
  }

  return { totalPorCobrar, totalVencido, porVencer30, cobradoEsteMes, cuentasVencidas };
};

// Rangos de antigüedad (días de atraso). El último es abierto (91 → ∞).
const AGING_DEFS: Array<{ key: string; label: string; min: number; max: number }> = [
  { key: "0-30", label: "0–30 días", min: 0, max: 30 },
  { key: "31-60", label: "31–60 días", min: 31, max: 60 },
  { key: "61-90", label: "61–90 días", min: 61, max: 90 },
  { key: "90+", label: "+90 días", min: 91, max: Infinity },
];

/**
 * Distribuye el saldo vencido por antigüedad. El conjunto de "vencidas" usa la
 * MISMA definición `isCuentaVencida` que el KPI "Vencido" y la alerta, de modo
 * que el total de la antigüedad coincide EXACTAMENTE con `totalVencido`: toda
 * cuenta vencida tiene `diasVencido >= 0` (0 = vence hoy, que cae en el primer
 * rango "0–30") y los rangos cubren `[0, ∞)` sin huecos, así que cada cuenta
 * cae en exactamente uno. Cada cuenta se ubica según sus días de atraso
 * (`hoy − fecha_vencimiento`).
 */
export const computeAgingBuckets = (
  cuentas: CuentaPorCobrar[],
  todayUTC: number,
): AgingBucket[] => {
  const vencidas = cuentas.filter((c) => isCuentaVencida(c, todayUTC));

  return AGING_DEFS.map(({ key, label, min, max }) => {
    let count = 0;
    let amount = 0;
    for (const c of vencidas) {
      const dias = diasVencido(c.fecha_vencimiento, todayUTC);
      if (dias >= min && dias <= max) {
        count += 1;
        amount += safeParseAmount(c.saldo);
      }
    }
    return { key, label, count, amount };
  });
};
