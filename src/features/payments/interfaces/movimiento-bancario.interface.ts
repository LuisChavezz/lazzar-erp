/**
 * Contrato de `GET /finanzas/movimientos-bancarios/` filtrado por `?pago={id}`
 * (`MovimientoBancarioSerializer`, `fields = "__all__"` más
 * `cuenta_bancaria_alias` de solo lectura). Nombres de llaves EN ESPAÑOL tal
 * cual los devuelve el backend — no traducir.
 *
 * Arreglo plano, decimales como STRING y fechas "YYYY-MM-DD", como el resto de
 * finanzas. Aquí solo se declara lo que la sección de "movimientos ligados" del
 * detalle del pago consume.
 *
 * Los valores de `tipo_movimiento` y `estatus` son los mismos enums que ya usa
 * el resumen de cuenta bancaria; se reimportan de allí para no tener dos
 * definiciones del mismo enum.
 */
import type {
  EstatusMovimientoCuenta,
  TipoMovimientoCuenta,
} from "@/src/features/bank-accounts/interfaces/bank-account.interface";

export interface MovimientoBancario {
  id: number;
  /** FK a la cuenta bancaria del pago. */
  cuenta_bancaria: number;
  /** Calculado (`source="cuenta_bancaria.alias"`), solo lectura. */
  cuenta_bancaria_alias: string | null;
  /** FK al pago que lo originó. */
  pago: number | null;
  /** FK al cobro que lo originó (siempre `null` en los movimientos de un pago). */
  cobro: number | null;
  /** Fecha "YYYY-MM-DD". */
  fecha: string;
  concepto: string | null;
  referencia: string | null;
  /** Decimal en string. */
  importe: string;
  /** Saldo de la cuenta tras el movimiento. Decimal en string. */
  saldo: string;
  /** Un pago genera siempre un `Cargo`. */
  tipo_movimiento: TipoMovimientoCuenta;
  /** Nace `Pendiente`; cancelar el pago lo deja en `Cancelado`. */
  estatus: EstatusMovimientoCuenta;
  origen: string | null;
}
