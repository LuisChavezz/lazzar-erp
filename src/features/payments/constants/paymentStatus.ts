import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { CxPEstatus } from "@/src/features/accounts-payable/interfaces/accounts-payable.interface";
import type { MetodoPago, PagoEstatus } from "../interfaces/payment.interface";

/**
 * Estatus que dejan una CxP disponible para aplicarle un pago. `Pagada` y
 * `Cancelada` quedan fuera de la selección: son terminales. Una CxP vencida SÍ
 * se ofrece: lo vencido no es un estatus (ver `CxPEstatus`), así que llega como
 * `Pendiente` o `Parcial`.
 *
 * El filtro por estatus se resuelve EN CLIENTE: el `get_queryset` del backend
 * hace `qs.filter(estatus=estatus)` con un solo valor, así que no admite "Pendiente
 * O Parcial" en una sola llamada. Lo que sí se delega al servidor es
 * `saldo_pendiente=true` (`saldo__gt=0`), ver `getCuentasPorPagar`.
 */
export const CXP_ESTATUS_APLICABLES: readonly CxPEstatus[] = [
  "Pendiente",
  "Parcial",
];

/**
 * Presentación del `estatus` del pago. Las llaves son los valores CRUDOS del
 * backend, no etiquetas traducidas.
 *
 * `Borrador` se incluye porque una LECTURA puede traerlo (el enum del modelo lo
 * admite y otro cliente podría crearlo), aunque esta UI nunca lo produzca: el
 * alta manda siempre `Aplicado`.
 */
export const PAGO_ESTATUS_CONFIG: Record<PagoEstatus, StatusBadgeConfigEntry> = {
  Borrador: {
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  Aplicado: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Cancelado: {
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

/**
 * Métodos de pago del enum del backend, en el orden en que se ofrecen: la ÚNICA
 * lista. De ella salen el selector del alta (`METODO_PAGO_OPTIONS`), el filtro
 * de la tabla (`optionsFromConfig`) y el enum del esquema (`METODO_PAGO_VALUES`).
 * `Record<MetodoPago, …>` obliga a cubrir el tipo completo. Sin `label`: el
 * backend ya los nombra en español, así que la etiqueta es el valor.
 */
export const METODO_PAGO_CONFIG: Record<MetodoPago, { label?: string }> = {
  Transferencia: {},
  Efectivo: {},
  Cheque: {},
  Tarjeta: {},
};

/** Valores de `METODO_PAGO_CONFIG`, en su orden (tupla no vacía para `z.enum`). */
export const METODO_PAGO_VALUES = Object.keys(METODO_PAGO_CONFIG) as [MetodoPago, ...MetodoPago[]];

/** Opciones del selector del alta: valor que viaja al API y su etiqueta. */
export const METODO_PAGO_OPTIONS: readonly { value: MetodoPago; label: string }[] =
  METODO_PAGO_VALUES.map((value) => ({ value, label: METODO_PAGO_CONFIG[value].label ?? value }));
