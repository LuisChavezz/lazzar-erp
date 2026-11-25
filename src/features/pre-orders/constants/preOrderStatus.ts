import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { PRODUCTION_ORDER_STATUS_CODE } from "@/src/features/production-orders/constants/productionOrderStatus";
import type { PreOrderStatus } from "../interfaces/pre-order.interface";

/** Badge por estatus. */
export const PRE_ORDER_STATUS_CFG: Record<PreOrderStatus, StatusBadgeConfigEntry> = {
  pendiente_aceptar: {
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
    dot: "bg-orange-500",
    label: "Pendiente de aceptar",
  },
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
  rechazada: {
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    dot: "bg-rose-500",
    label: "Rechazada",
  },
};

/** Qué sigue en cada estatus, en palabras del usuario. */
export const PRE_ORDER_NEXT_STEP: Record<PreOrderStatus, string> = {
  pendiente_aceptar: "Producción: revisa el resurtido de planeación y acéptalo o recházalo.",
  pendiente_validar: "Almacén: confirma existencias.",
  faltan_materiales: "Falta material: confirma existencias para mandarlo a compras.",
  en_compra: "Compras surte el material. Se libera sola al recibirlo.",
  lista: "Material completo: crea la OP.",
  convertida: "Lista: ya tiene OP.",
  cancelada: "Cancelada.",
  rechazada: "Rechazada por producción.",
};

export const canConfirmPreOrder = (s: PreOrderStatus) =>
  s === "pendiente_validar" || s === "faltan_materiales";
export const canCreateOpFromPreOrder = (s: PreOrderStatus) => s === "lista";
export const isClosedPreOrderStatus = (s: PreOrderStatus) =>
  s === "convertida" || s === "cancelada" || s === "rechazada";
/**
 * ¿Su OP ligada está cancelada? (`op_estatus`, EC-968). Una pre-orden Convertida
 * con su OP cancelada se puede cancelar para que el pedido genere otra.
 */
export const isPreOrderOpCancelled = (s: PreOrderStatus, opEstatus?: number | null) =>
  s === "convertida" && opEstatus === PRODUCTION_ORDER_STATUS_CODE.CANCELLED;

/**
 * ¿Se ofrece "Cancelar pre-orden"? Abierta, o Convertida con su OP cancelada:
 * la misma regla que `pre-ordenes/{id}/cancelar/` (nucleo-erp#1355, EC-968).
 */
export const canCancelPreOrder = (s: PreOrderStatus, opEstatus?: number | null) =>
  !isClosedPreOrderStatus(s) || isPreOrderOpCancelled(s, opEstatus);

/** Qué sigue, con el caso de la Convertida cuya OP se canceló. */
export const preOrderNextStep = (s: PreOrderStatus, opEstatus?: number | null) =>
  isPreOrderOpCancelled(s, opEstatus)
    ? "La OP se canceló: cancela la pre-orden para que el pedido genere otra."
    : PRE_ORDER_NEXT_STEP[s];
export const canAcceptPreOrder = (s: PreOrderStatus) => s === "pendiente_aceptar";

/** Avance de un renglón de resurtido. */
export const LINE_AVANCE_CFG: Record<string, StatusBadgeConfigEntry> = {
  pendiente: { cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", dot: "bg-amber-500", label: "Sin OP" },
  con_op: { cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", dot: "bg-sky-500", label: "Con OP" },
  por_comprar: { cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", dot: "bg-amber-500", label: "Por comprar" },
  en_compra: { cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300", dot: "bg-violet-500", label: "En compra" },
  recibido: { cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", dot: "bg-emerald-500", label: "Recibido" },
};
