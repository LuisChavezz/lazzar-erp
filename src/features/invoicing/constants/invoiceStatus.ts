import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Estatus posibles de una factura, tal como los devuelve el backend
 * (`estatus` en {@link import("../interfaces/invoice.interface").Invoice}).
 * Fuente única: tanto la columna de estatus (`InvoiceColumns`) como los KPIs
 * (`InvoiceStats`) comparan contra estas constantes en vez de re-declarar los
 * literales — si el backend renombra un estatus, ambos dejan de reconocerlo
 * de forma visible (badge gris) en lugar de que los KPIs lo cuenten mal en
 * silencio.
 */
export const INVOICE_STATUS = {
  EMITIDA: "Emitida",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
} as const;

export const INVOICE_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  [INVOICE_STATUS.EMITIDA]: {
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  [INVOICE_STATUS.PAGADA]: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  [INVOICE_STATUS.VENCIDA]: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  [INVOICE_STATUS.CANCELADA]: {
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};

/**
 * Estatus en los que una factura puede enviarse por correo al cliente.
 *
 * Cubre ÚNICAMENTE el envío, no la descarga del PDF: el riesgo es que salga
 * hacia el cliente un comprobante cancelado presentado como vigente. Descargar
 * el PDF de una factura cancelada es un uso interno legítimo (el documento se
 * rotula a sí mismo con su estatus), así que esa acción no consulta esta
 * compuerta — ver `InvoiceColumns`.
 *
 * A diferencia de una orden de compra —cuya compuerta de envío era "autorizada
 * o más avanzada" porque la OC arranca en un estado editable (Borrador) del que
 * no debe salir un documento en firme— una factura nace ya emitida: no existe
 * un estado previo tipo borrador. El único estado inválido para enviarla es
 * `Cancelada` (CFDI cancelado). Por eso la compuerta es "cualquier estatus
 * reconocido excepto Cancelada".
 *
 * Se declara como conjunto explícito (en vez de `estatus !== "Cancelada"`) para
 * que un estatus nuevo/desconocido del backend NO se trate como enviable por
 * defecto: ante la duda, un comprobante fiscal no debe salir hacia el cliente.
 */
export const INVOICE_SENDABLE_STATUSES: readonly string[] = [
  INVOICE_STATUS.EMITIDA,
  INVOICE_STATUS.PAGADA,
  INVOICE_STATUS.VENCIDA,
];

/**
 * ¿La factura está en un estatus en el que puede enviarse por correo al
 * cliente? Fuente única para la habilitación de la acción "Enviar correo" en
 * `InvoiceColumns` y para la validación autoritativa del Route Handler de
 * envío. "Descargar PDF" NO la consulta (ver arriba).
 */
export const isInvoiceSendable = (estatus: string | null | undefined): boolean =>
  estatus != null && INVOICE_SENDABLE_STATUSES.includes(estatus);
