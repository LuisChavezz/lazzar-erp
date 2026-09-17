import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { FacturaProveedorEstatus } from "../interfaces/supplier-invoice.interface";

/**
 * Presentación del `estatus` de la factura de proveedor. Llaves = valores CRUDOS
 * del backend.
 *
 * `Registrada` va en ámbar, como la nota de crédito `Emitida`: no es un estado
 * "todo bien" sino el que tiene efecto contable (generó una cuenta por pagar y
 * congeló los importes).
 */
export const FACTURA_PROVEEDOR_ESTATUS_CONFIG: Record<
  FacturaProveedorEstatus,
  StatusBadgeConfigEntry
> = {
  Borrador: {
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  Registrada: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Cancelada: {
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

/** Opciones del filtro de estatus: valores crudos del enum (el filtro compara con `===`). */
export const FACTURA_PROVEEDOR_ESTATUS_FILTER = [
  { value: "Borrador", label: "Borrador" },
  { value: "Registrada", label: "Registrada" },
  { value: "Cancelada", label: "Cancelada" },
];
