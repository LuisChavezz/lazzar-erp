import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type {
  RfidReconciliationBase,
  RfidReconciliationEstatus,
  RfidReconciliationTipoOrigen,
} from "../interfaces/rfid-reconciliation.interface";

/** Ruta de la pantalla (WMS, grupo RFID). */
export const RFID_RECONCILIATIONS_PATH = "/wms/rfid-reconciliations";

/** Donde se hace la recepción formal después de aceptar. */
export const RECEIPTS_PATH = "/wms/receipts";

/**
 * Crear, escanear, aceptar y cancelar exigen `C-WMS-RECEPCIONES` en el backend
 * (`403` sin él). Los `GET` solo piden sesión (nucleo-erp#1439); la regla de la
 * ruta es `R-WMS-RECEPCIONES`, como Recepciones.
 */
export const RFID_RECONCILIATION_WRITE_PERMISSION = "C-WMS-RECEPCIONES";

/** Prefijo de todas las consultas de encuadres (listado, detalle, onboarding). */
export const RFID_RECONCILIATIONS_KEY = ["rfid-reconciliations"] as const;

export const rfidReconciliationDetailQueryKey = (id: number) =>
  [...RFID_RECONCILIATIONS_KEY, "detail", id] as const;

export const RFID_RECONCILIATION_ONBOARDING_KEY = [...RFID_RECONCILIATIONS_KEY, "onboarding"] as const;

export const RFID_RECONCILIATION_ESTATUS_VALUES = [
  "PENDIENTE",
  "ACEPTADO",
  "CANCELADO",
] as const satisfies readonly RfidReconciliationEstatus[];

export const RFID_RECONCILIATION_TIPO_ORIGEN_VALUES = ["OC", "OP"] as const satisfies readonly RfidReconciliationTipoOrigen[];

export const RFID_RECONCILIATION_TIPO_ORIGEN_LABELS: Record<RfidReconciliationTipoOrigen, string> = {
  OC: "Orden de compra",
  OP: "Orden de producción",
};

export const RFID_RECONCILIATION_STATUS_CONFIG: Record<RfidReconciliationEstatus, StatusBadgeConfigEntry> = {
  PENDIENTE: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  ACEPTADO: {
    label: "Aceptado",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  CANCELADO: {
    label: "Cancelado",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

/**
 * El folio de la orden de origen, que es como se nombra el encuadre (no tiene
 * folio propio, igual que en la bitácora). Sin folio, `#id` del encuadre.
 */
export const rfidReconciliationOriginFolio = (
  row: Pick<RfidReconciliationBase, "tipo_origen" | "orden_compra_folio" | "op_folio">,
): string | null =>
  (row.tipo_origen === "OP" ? row.op_folio : row.orden_compra_folio)?.trim() || null;

/** "Encuadre #12 · OC-00045". */
export const rfidReconciliationLabel = (
  row: Pick<RfidReconciliationBase, "id" | "tipo_origen" | "orden_compra_folio" | "op_folio">,
): string => {
  const folio = rfidReconciliationOriginFolio(row);
  return folio ? `Encuadre #${row.id} · ${folio}` : `Encuadre #${row.id}`;
};

/** Igual que `rfidReconciliationLabel`, en minúscula para media oración: "el encuadre #12 · OC-00045". */
export const rfidReconciliationInlineLabel = (
  row: Pick<RfidReconciliationBase, "id" | "tipo_origen" | "orden_compra_folio" | "op_folio">,
): string => rfidReconciliationLabel(row).replace(/^Encuadre/, "encuadre");

/** Qué se puede hacer con un encuadre en su estatus (además del permiso). */
export const rfidReconciliationActions = (estatus: RfidReconciliationEstatus) => ({
  canScan: estatus === "PENDIENTE",
  canAccept: estatus === "PENDIENTE",
  canCancel: estatus === "PENDIENTE" || estatus === "ACEPTADO",
});
