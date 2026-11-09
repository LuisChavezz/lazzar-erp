import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { PreOrderStatus } from "../interfaces/pre-order.interface";

/** Badge por estatus. */
export const PRE_ORDER_STATUS_CFG: Record<PreOrderStatus, StatusBadgeConfigEntry> = {
  pendiente_validar: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
    label: "Pendiente de validar",
  },
  faltan_materiales: {
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    dot: "bg-rose-500",
    label: "Faltan materiales",
  },
  en_compra: {
    cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    dot: "bg-violet-500",
    label: "En compra",
  },
  lista: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Lista para producir",
  },
  convertida: {
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    dot: "bg-sky-500",
    label: "Convertida en OP",
  },
  cancelada: {
    cls: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    dot: "bg-slate-400",
    label: "Cancelada",
  },
};

/** Qué sigue en cada estatus, en palabras del usuario. */
export const PRE_ORDER_NEXT_STEP: Record<PreOrderStatus, string> = {
  pendiente_validar: "Almacén: confirma existencias.",
  faltan_materiales: "Falta material: confirma existencias para mandarlo a compras.",
  en_compra: "Compras surte el material. Se libera sola al recibirlo.",
  lista: "Material completo: crea la OP.",
  convertida: "Lista: ya tiene OP.",
  cancelada: "Cancelada.",
};

export const canConfirmPreOrder = (s: PreOrderStatus) =>
  s === "pendiente_validar" || s === "faltan_materiales";
export const canCreateOpFromPreOrder = (s: PreOrderStatus) => s === "lista";
export const canCancelPreOrder = (s: PreOrderStatus) => s !== "convertida" && s !== "cancelada";
