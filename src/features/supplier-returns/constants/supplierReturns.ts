import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { SupplierReturnEstatus } from "../interfaces/supplier-return.interface";

/** Ruta de la pantalla (WMS, junto a Calidad). */
export const SUPPLIER_RETURNS_PATH = "/wms/supplier-returns";

/**
 * Permisos del backend (`compras/api/devoluciones.py`): leer exige
 * `R-WMS-RECEPCIONES` (también es la regla de la ruta) y crear o cancelar
 * `C-WMS-RECEPCIONES`; sin él, `403`.
 */
export const SUPPLIER_RETURN_WRITE_PERMISSION = "C-WMS-RECEPCIONES";

/** Prefijo de todas las consultas de devoluciones (listado, detalle, pendientes). */
export const SUPPLIER_RETURNS_KEY = ["supplier-returns"] as const;

export const supplierReturnDetailQueryKey = (id: number) =>
  [...SUPPLIER_RETURNS_KEY, "detail", id] as const;

export const supplierReturnPendientesQueryKey = (inspectionId: number) =>
  [...SUPPLIER_RETURNS_KEY, "pendientes", inspectionId] as const;

export const SUPPLIER_RETURN_ESTATUS_VALUES = ["aplicada", "cancelada"] as const satisfies readonly SupplierReturnEstatus[];

export const SUPPLIER_RETURN_STATUS_CONFIG: Record<SupplierReturnEstatus, StatusBadgeConfigEntry> = {
  aplicada: {
    label: "Aplicada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  cancelada: {
    label: "Cancelada",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

const NEUTRAL_STATUS: StatusBadgeConfigEntry = {
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  dot: "bg-slate-400",
};

/** Entrada del badge; un estatus desconocido se rotula con el valor crudo. */
export const supplierReturnStatusEntry = (estatus: string): StatusBadgeConfigEntry =>
  SUPPLIER_RETURN_STATUS_CONFIG[estatus as SupplierReturnEstatus] ?? { ...NEUTRAL_STATUS, label: estatus };

/** Cómo se nombra una devolución: su folio o, sin él, `#id`. */
export const supplierReturnLabel = (dev: { id: number; folio: string | null }) =>
  dev.folio?.trim() || `#${dev.id}`;
