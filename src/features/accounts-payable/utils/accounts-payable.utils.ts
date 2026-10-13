// Funciones puras de derivación para Cuentas por Pagar: la marca de vencida, las
// reglas de borrado y el formato de importes por moneda. No consultan la hora por
// su cuenta: la vista calcula "hoy" UNA vez (`getMexicoTodayDate`, el día del
// backend) y lo comparte entre la tabla, el filtro "Solo vencidas" y el detalle.

import { safeParseAmount } from "@/src/utils/formatCurrency";
import type { CuentaPorPagar } from "../interfaces/accounts-payable.interface";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * DEFINICIÓN ÚNICA DE "VENCIDA" para una cuenta por pagar. La usan la marca de la
 * tabla, el filtro "Solo vencidas" y el detalle; ninguna superficie debe usar
 * otro criterio.
 *
 * Es el MISMO criterio que `?vencidas=true` del backend. Una cuenta está vencida
 * cuando cumple TODAS:
 *   1. tiene `fecha_vencimiento` (una cuenta sin vencimiento nunca vence);
 *   2. su vencimiento es ANTERIOR a hoy — estricto: la que vence HOY todavía no
 *      está vencida (distinto de `isCuentaVencida` de CxC, que usa `<=`);
 *   3. conserva saldo (`saldo > 0`): una cuenta pagada no está vencida;
 *   4. no está `Cancelada`.
 *
 * `today` es "YYYY-MM-DD" en la zona del backend (`getMexicoTodayDate`, de
 * `src/utils/mexicoTime.ts`): el filtro `?vencidas=true` compara contra
 * `timezone.localdate()`, así que la marca y el filtro coinciden sin importar
 * la zona del navegador. Dos fechas ISO del
 * mismo formato se comparan exactas como strings, sin pasar por `Date` ni por
 * zonas horarias. Una `fecha_vencimiento` mal formada NO se marca vencida.
 *
 * Nunca es un `estatus` ni un campo persistido.
 */
export const isCuentaPorPagarVencida = (
  cuenta: Pick<CuentaPorPagar, "fecha_vencimiento" | "estatus" | "saldo">,
  today: string,
): boolean => {
  const vencimiento = cuenta.fecha_vencimiento;
  if (vencimiento === null || !ISO_DATE_RE.test(vencimiento)) return false;
  if (cuenta.estatus === "Cancelada") return false;
  if (safeParseAmount(cuenta.saldo) <= 0) return false;
  return vencimiento < today;
};

/**
 * ¿La cuenta tiene pagos aplicados? `total_pagado` lo calcula el backend
 * (`total − saldo`, cuantizado a 2 decimales), así que una cuenta sin pagos
 * aplicados llega EXACTAMENTE como "0.00".
 *
 * Se compara el string literal a propósito: ante un formato inesperado se asume
 * que SÍ hay pagos (falla cerrada), de modo que la acción de eliminar se oculta
 * en vez de ofrecerse sobre una cuenta que el backend rechazaría.
 */
export const hasAppliedPayments = (
  cuenta: Pick<CuentaPorPagar, "total_pagado">,
): boolean => cuenta.total_pagado !== "0.00";

/**
 * ¿Se ofrece "Eliminar"? Solo sobre cuentas SIN pagos aplicados y que no estén
 * `Cancelada`. El backend reconfirma la regla de los pagos (400) al borrar, así
 * que un listado rancio no puede saltársela.
 */
export const canDeleteCuentaPorPagar = (
  cuenta: Pick<CuentaPorPagar, "total_pagado" | "estatus">,
): boolean => !hasAppliedPayments(cuenta) && cuenta.estatus !== "Cancelada";

/** Importe con dos decimales y sin símbolo, para cuando no se conoce la moneda. */
const IMPORTE_SIN_MONEDA: Intl.NumberFormatOptions = {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/**
 * Opciones de formato para un importe de la cuenta. Con código de moneda, en esa
 * moneda; sin él, sin símbolo: caer al MXN por defecto de `formatCurrency`
 * pintaría una factura en USD con signo de pesos (mismo criterio que
 * `CreditNoteDetailDialog`).
 */
export const moneyFormatFor = (
  monedaCodigo: string | null,
): Intl.NumberFormatOptions =>
  monedaCodigo ? { currency: monedaCodigo } : IMPORTE_SIN_MONEDA;
