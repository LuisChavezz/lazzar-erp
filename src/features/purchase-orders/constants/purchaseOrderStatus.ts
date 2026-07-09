/**
 * Valores de `PurchaseOrder.estatus` confirmados contra el backend
 * (`OrdenCompra.estatus`). `BORRADOR` es el default del modelo Django pero
 * nunca lo asigna el único flujo real de creación (`POST
 * /compras/ordenes/onboarding/` siempre asigna `PENDIENTE`); solo ocurriría
 * si una orden se creara fuera de la API (admin/shell). `CANCELADA` tampoco
 * la asigna ningún endpoint hoy — no existe una acción de cancelar.
 */
export const PURCHASE_ORDER_STATUS = {
  BORRADOR: 1,
  PENDIENTE: 2,
  AUTORIZADA: 3,
  PARCIALMENTE_RECIBIDA: 4,
  RECIBIDA: 5,
  CANCELADA: 6,
} as const;

export const isPurchaseOrderDraft = (estatus: number) =>
  estatus === PURCHASE_ORDER_STATUS.BORRADOR;

export const isPurchaseOrderPending = (estatus: number) =>
  estatus === PURCHASE_ORDER_STATUS.PENDIENTE;

/** Autorizada, parcialmente recibida o recibida — orden ya avanzó más allá de pendiente. */
export const isPurchaseOrderAuthorizedOrComplete = (estatus: number) =>
  (
    [
      PURCHASE_ORDER_STATUS.AUTORIZADA,
      PURCHASE_ORDER_STATUS.PARCIALMENTE_RECIBIDA,
      PURCHASE_ORDER_STATUS.RECIBIDA,
    ] as number[]
  ).includes(estatus);

export const isPurchaseOrderCancelled = (estatus: number) =>
  estatus === PURCHASE_ORDER_STATUS.CANCELADA;

/**
 * Borrador o pendiente — la orden aún no se autoriza, por lo que sigue
 * pudiendo editarse, confirmarse o eliminarse. A partir de autorizada
 * ninguna de esas tres acciones debe quedar disponible (ya hay compromiso
 * con el proveedor y, más adelante, posibles recepciones asociadas).
 */
export const isPurchaseOrderEditable = (estatus: number) =>
  isPurchaseOrderDraft(estatus) || isPurchaseOrderPending(estatus);

/**
 * Colores del badge de estatus, compartidos entre `PurchaseOrderColumns.tsx`
 * (listado) y `PurchaseOrderDetailDialog.tsx` (detalle) — antes duplicados
 * en ambos archivos y sin cubrir todos los valores reales (solo 1/4/5), por
 * lo que la mayoría de las órdenes (creadas en PENDIENTE) mostraban el color
 * neutro de Borrador.
 */
export const PURCHASE_ORDER_ESTATUS_CFG: Record<number, { cls: string; dot: string }> = {
  [PURCHASE_ORDER_STATUS.BORRADOR]: {
    cls: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  [PURCHASE_ORDER_STATUS.PENDIENTE]: {
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  [PURCHASE_ORDER_STATUS.AUTORIZADA]: {
    cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  [PURCHASE_ORDER_STATUS.PARCIALMENTE_RECIBIDA]: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  [PURCHASE_ORDER_STATUS.RECIBIDA]: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  [PURCHASE_ORDER_STATUS.CANCELADA]: {
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};
