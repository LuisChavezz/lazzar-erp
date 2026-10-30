import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type {
  MovementLedgerDocumento,
  MovementLedgerEfecto,
  MovementLedgerTm,
} from "@/src/features/stock/interfaces/movement-ledger.interface";

/**
 * Etiquetas del Auxiliar de movimientos. Viven en el reporte y no se comparten
 * con `MOVEMENT_TYPE_CONFIG` (movimientos manuales): ese mapa nombra la
 * transferencia `TRASPASO`, y aquí el backend manda `TRANSFERENCIA`. Cada mapa
 * es un `Record` del enum completo, así que un valor nuevo en el contrato falla
 * en `typecheck` hasta tener etiqueta.
 */

/** Tipo de movimiento (columna TM). */
export const MOVEMENT_LEDGER_TM_CONFIG: Record<MovementLedgerTm, StatusBadgeConfigEntry> = {
  ENTRADA: {
    label: "Entrada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  SALIDA: {
    label: "Salida",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  AJUSTE: {
    label: "Ajuste",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  TRANSFERENCIA: {
    label: "Transferencia",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
};

/** Cómo afectó el renglón al almacén. */
export const MOVEMENT_LEDGER_EFECTO_CONFIG: Record<
  MovementLedgerEfecto,
  { label: string; textClass: string }
> = {
  ENTRADA: { label: "Entrada", textClass: "text-emerald-600 dark:text-emerald-400" },
  SALIDA: { label: "Salida", textClass: "text-rose-600 dark:text-rose-400" },
  SIN_CAMBIO: { label: "Sin cambio", textClass: "text-slate-500 dark:text-slate-400" },
};

/** Documento que originó el movimiento. */
export const MOVEMENT_LEDGER_DOCUMENTO_LABELS: Record<MovementLedgerDocumento, string> = {
  RECEPCION: "Recepción",
  TRANSFERENCIA: "Transferencia",
  ORDEN_PRODUCCION: "Orden de producción",
  AJUSTE: "Ajuste",
  PEDIDO: "Pedido",
  MOVIMIENTO_MANUAL: "Movimiento manual",
};

/**
 * Etiqueta de un valor que el contrato aún no conoce: el código crudo, para no
 * pintar una celda vacía si el backend agrega un valor.
 */
export const labelOrCode = <K extends string>(labels: Record<K, string>, code: string): string =>
  (labels as Record<string, string>)[code] ?? code;
