import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

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

/**
 * Autorizada y con recepciones parciales registradas: la mercancía ya está
 * entrando pero la orden todavía no se cierra. Es el estado "en curso" del
 * ciclo de compra y lo consume el dashboard.
 */
export const isPurchaseOrderPartiallyReceived = (estatus: number) =>
  estatus === PURCHASE_ORDER_STATUS.PARCIALMENTE_RECIBIDA;

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
 * Colores y etiquetas por estatus, en la forma `StatusBadgeConfigEntry` que
 * consume el `<StatusBadge>` compartido — antes era un `{ cls, dot }` suelto
 * sin `label`, lo que obligaba a `PurchaseOrderColumns` y
 * `PurchaseOrderDetailDialog` a reimplementar el badge a mano cada uno.
 *
 * El objeto intermedio con llaves numéricas obliga a TypeScript a exigir las 6
 * entradas (`satisfies`); lo exportado se tipa `Record<string, …>` porque
 * `StatusBadge` recibe el estatus ya convertido a string. Mismo patrón que
 * `CORTE_MANGA_ORDER_STATUS_CONFIG` y `EMBROIDERY_STATUS_CONFIG`.
 *
 * `4` (Parcialmente recibida) usa naranja y no ámbar para no confundirse con
 * `2` (Pendiente a confirmar): son dos puntos MUY distintos del ciclo y en el
 * listado conviven en pantalla.
 */
const STATUS_BY_CODE = {
  [PURCHASE_ORDER_STATUS.BORRADOR]: {
    label: "Borrador",
    cls: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  [PURCHASE_ORDER_STATUS.PENDIENTE]: {
    label: "Pendiente a confirmar",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  [PURCHASE_ORDER_STATUS.AUTORIZADA]: {
    label: "Autorizada",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  [PURCHASE_ORDER_STATUS.PARCIALMENTE_RECIBIDA]: {
    label: "Parcialmente recibida",
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  [PURCHASE_ORDER_STATUS.RECIBIDA]: {
    label: "Recibida",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  [PURCHASE_ORDER_STATUS.CANCELADA]: {
    label: "Cancelada",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
} satisfies Record<number, StatusBadgeConfigEntry>;

export const PURCHASE_ORDER_ESTATUS_CFG: Record<string, StatusBadgeConfigEntry> =
  STATUS_BY_CODE;

/** Badge neutro para estatus fuera de 1-6, rotulado con lo que mande el backend. */
const NEUTRAL_STATUS_CFG: StatusBadgeConfigEntry = {
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  dot: "bg-slate-400",
};

/**
 * Entrada de badge para un estatus concreto: el COLOR sale del mapa local
 * (indexado por el entero `estatus`) y la ETIQUETA también cuando el código
 * está en 1-6. El `estatus_label` del backend entra solo como RESPALDO —para
 * códigos fuera de 1-6 que este mapa no cubre—; el entero crudo es el último
 * recurso. Mismo patrón que `corteMangaStatusEntry` y `productionOrderStatusEntry`.
 */
export const purchaseOrderStatusEntry = (
  estatus: number,
  display?: string | null,
): StatusBadgeConfigEntry => {
  const base = PURCHASE_ORDER_ESTATUS_CFG[String(estatus)] ?? NEUTRAL_STATUS_CFG;
  return { ...base, label: base.label || display?.trim() || String(estatus) };
};
