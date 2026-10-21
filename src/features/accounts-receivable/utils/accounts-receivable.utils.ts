// Funciones puras de derivación para Cuentas por Cobrar: mapeo de filas, KPIs y
// antigüedad de saldos. Operan sobre la respuesta del backend (`CuentaPorCobrar[]`)
// y NO consultan la hora por su cuenta: reciben `today` ("YYYY-MM-DD", el día del
// backend en `America/Mexico_City`, de `useBackendToday`) para que la vista lo
// calcule UNA sola vez y lo comparta entre las tarjetas KPI, la antigüedad y la
// tabla. Es el mismo día con el que el backend resuelve `?vencidas=`
// (`timezone.localdate()`), así que la marca y el filtro coinciden.

import { safeParseAmount } from "@/src/utils/formatCurrency";
import type {
  AgingBucket,
  CuentaPorCobrar,
  CuentaPorCobrarRow,
  CxCKpis,
} from "../interfaces/accounts-receivable.interface";

const DIA_MS = 86_400_000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Días con signo desde `today` hasta el vencimiento: `> 0` faltan por vencer,
 * `= 0` vence hoy, `< 0` ya venció. Las dos son fechas-calendario `YYYY-MM-DD`
 * que `Date.parse` lee como medianoche UTC, así que la resta es un entero exacto
 * sin importar la zona del navegador. `null` ante una fecha ausente o inválida.
 */
const daysUntilDue = (fechaVencimiento: string | null, today: string): number | null => {
  if (fechaVencimiento === null || !ISO_DATE_RE.test(fechaVencimiento)) return null;
  const venc = Date.parse(fechaVencimiento);
  const hoy = Date.parse(today);
  if (Number.isNaN(venc) || Number.isNaN(hoy)) return null;
  return Math.round((venc - hoy) / DIA_MS);
};

/** Días de atraso (`hoy − vencimiento`), acotado a 0 cuando aún no vence o no hay fecha. */
export const diasVencido = (fechaVencimiento: string | null, today: string): number =>
  Math.max(0, -(daysUntilDue(fechaVencimiento, today) ?? 0));

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
 *   3. su fecha de vencimiento es ANTERIOR a hoy (`fecha_vencimiento < hoy`).
 *      Una cuenta que vence HOY todavía no está vencida: es "por vencer" (ver
 *      `porVencer30`) y la antigüedad empieza en "1–30 días". Mismo criterio que
 *      el filtro `?vencidas=` del backend (`fecha_vencimiento__lt=localdate()`)
 *      y que CxP. Sin `fecha_vencimiento` o con una inválida NO es vencida.
 *
 * Se deriva por FECHA en el cliente porque el backend no tiene un estatus
 * "Vencida": su enum es Pendiente/Parcial/Pagada/Cancelada y una cuenta vencida
 * sigue leyéndose `Pendiente` o `Parcial`. Vencida solo existe como el filtro
 * `?vencidas=` del backend, que también la calcula por fecha. `estatus` se usa
 * solo para descartar estados terminales (Pagada/Cancelada).
 */
export const isCuentaVencida = (
  cuenta: Pick<CuentaPorCobrar, "estatus" | "saldo" | "fecha_vencimiento">,
  today: string,
): boolean => {
  if (cuenta.estatus === "Pagada" || cuenta.estatus === "Cancelada") return false;
  if (safeParseAmount(cuenta.saldo) <= 0) return false;
  const dias = daysUntilDue(cuenta.fecha_vencimiento, today);
  return dias !== null && dias < 0;
};

/** Folio de presentación derivado del `id` real (el backend no expone folio de CxC). */
export const formatFolioCxc = (id: number): string =>
  `CXC-${String(id).padStart(5, "0")}`;

/** Enriquece una cuenta con los campos derivados que consume la tabla. */
export const mapCuentaToRow = (
  cuenta: CuentaPorCobrar,
  today: string,
): CuentaPorCobrarRow => ({
  ...cuenta,
  folio_cxc: formatFolioCxc(cuenta.id),
  dias_vencido: diasVencido(cuenta.fecha_vencimiento, today),
  // Mismo criterio (`isCuentaVencida`) que alimenta KPIs, antigüedad y alerta,
  // de modo que la fila y los agregados nunca se contradicen.
  esta_vencida: isCuentaVencida(cuenta, today),
});

/** Mapea toda la lista a filas de tabla contra un mismo "hoy". */
export const mapCuentasToRows = (
  cuentas: CuentaPorCobrar[],
  today: string,
): CuentaPorCobrarRow[] => cuentas.map((c) => mapCuentaToRow(c, today));

/** ¿La fecha `YYYY-MM-DD` cae en el mismo mes y año que `today`? Compara el texto, sin zonas. */
const esMismoMes = (fecha: string, today: string): boolean =>
  ISO_DATE_RE.test(fecha) && fecha.slice(0, 7) === today.slice(0, 7);

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
 * - `porVencer30`: saldo abierto (`saldo > 0`) cuyo vencimiento cae entre HOY
 *   y los próximos 30 días (`0 <= dias <= 30`). Es el complemento sin traslape
 *   de lo vencido: una cuenta que vence HOY (`dias = 0`) todavía no es vencida,
 *   así que cuenta aquí. Requiere aritmética de fechas (no hay estatus ni
 *   parámetro del backend equivalente).
 * - `cobradoEsteMes`: APROXIMACIÓN. La respuesta no trae historial de pagos,
 *   solo `fecha_ultimo_pago`, `total` y `saldo`. Para las cuentas cuyo último
 *   pago cae en el mes en curso se toma `total − saldo` como proxy del monto
 *   cobrado. Es exacto solo para cuentas de un único pago; en cuentas con pagos
 *   en varios meses sobreestima (imputa todo el abono al mes del último pago).
 */
export const computeCxcKpis = (
  cuentas: CuentaPorCobrar[],
  today: string,
): CxCKpis => {
  let totalPorCobrar = 0;
  let totalVencido = 0;
  let porVencer30 = 0;
  let cobradoEsteMes = 0;
  let cuentasVencidas = 0;

  for (const c of cuentas) {
    const saldo = safeParseAmount(c.saldo);
    totalPorCobrar += saldo;

    if (isCuentaVencida(c, today)) {
      totalVencido += saldo;
      cuentasVencidas += 1;
    }

    if (saldo > 0) {
      // 0..30: lo que vence HOY (dias = 0) aún no está vencido.
      const dias = daysUntilDue(c.fecha_vencimiento, today);
      if (dias !== null && dias >= 0 && dias <= 30) porVencer30 += saldo;
    }

    if (c.fecha_ultimo_pago && esMismoMes(c.fecha_ultimo_pago, today)) {
      const abonado = safeParseAmount(c.total) - saldo;
      if (abonado > 0) cobradoEsteMes += abonado;
    }
  }

  return { totalPorCobrar, totalVencido, porVencer30, cobradoEsteMes, cuentasVencidas };
};

// Rangos de antigüedad (días de atraso). El último es abierto (91 → ∞).
const AGING_DEFS: Array<{ key: string; label: string; min: number; max: number }> = [
  { key: "1-30", label: "1–30 días", min: 1, max: 30 },
  { key: "31-60", label: "31–60 días", min: 31, max: 60 },
  { key: "61-90", label: "61–90 días", min: 61, max: 90 },
  { key: "90+", label: "+90 días", min: 91, max: Infinity },
];

/**
 * Distribuye el saldo vencido por antigüedad. El conjunto de "vencidas" usa la
 * MISMA definición `isCuentaVencida` que el KPI "Vencido" y la alerta, de modo
 * que el total de la antigüedad coincide EXACTAMENTE con `totalVencido`: toda
 * cuenta vencida tiene `diasVencido >= 1` (vencer hoy aún no es vencida) y los
 * rangos cubren `[1, ∞)` sin huecos, así que cada cuenta cae en exactamente uno. Cada cuenta se ubica según sus días de atraso
 * (`hoy − fecha_vencimiento`).
 */
export const computeAgingBuckets = (
  cuentas: CuentaPorCobrar[],
  today: string,
): AgingBucket[] => {
  const vencidas = cuentas.filter((c) => isCuentaVencida(c, today));

  return AGING_DEFS.map(({ key, label, min, max }) => {
    let count = 0;
    let amount = 0;
    for (const c of vencidas) {
      const dias = diasVencido(c.fecha_vencimiento, today);
      if (dias >= min && dias <= max) {
        count += 1;
        amount += safeParseAmount(c.saldo);
      }
    }
    return { key, label, count, amount };
  });
};
