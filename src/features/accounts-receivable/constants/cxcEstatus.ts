import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { CxCEstatus } from "../interfaces/accounts-receivable.interface";

/**
 * Colores por estatus de una cuenta por cobrar. Dominio propio de CxC (no se
 * comparte con el estatus de facturación): solo la presentación (`StatusBadge`)
 * es genérica, los valores no. Las llaves son los valores exactos del backend
 * —el valor y la etiqueta son el mismo string, no hay `estatus_label`—;
 * `StatusBadge` degrada con su estilo por defecto si llegara uno no listado.
 *
 * Vive aquí (y no en `AccountsReceivableColumns.tsx`) porque lo consumen tanto
 * la tabla como el diálogo de detalle, y el diálogo se importa DESDE las
 * columnas: tenerlo en las columnas crearía un ciclo de imports entre ambos.
 * Mismo patrón que `receipts/constants/receiptStatus.ts`.
 *
 * OJO: este badge refleja el `estatus` CRUDO del backend, que NO es la señal de
 * vencido —una cuenta ya vencida puede seguir leyéndose `Pendiente`/`Parcial`—.
 * El resaltado de vencido se deriva aparte con `isCuentaVencida`.
 */
export const CXC_ESTATUS_CONFIG: Record<CxCEstatus, StatusBadgeConfigEntry> = {
  Pendiente: {
    label: "Pendiente",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-400",
  },
  Parcial: {
    label: "Parcial",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  Pagada: {
    label: "Pagada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Cancelada: {
    label: "Cancelada",
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  Vencida: {
    label: "Vencida",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};
