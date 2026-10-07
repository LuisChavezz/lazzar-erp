import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { InvoiceEstatus } from "../interfaces/invoice.interface";

/**
 * Estatus posibles de una factura, tal como los devuelve el backend (enum
 * completo `Factura.FacturaStatus`: Borrador | Emitida | Cancelada).
 * Fuente única: la columna de estatus (`InvoiceColumns`), su filtro y los KPIs
 * (`InvoiceStats`) comparan contra estas constantes en vez de re-declarar los
 * literales — si el backend renombra un estatus, dejan de reconocerlo de forma
 * visible (badge gris) en lugar de que los KPIs lo cuenten mal en silencio.
 *
 * "Pagada" y "Vencida" NO son estatus de factura (lo son de la cuenta por
 * cobrar); el vencimiento se deriva de `fecha_vencimiento` en los KPIs.
 */
export const INVOICE_STATUS = {
  BORRADOR: "Borrador",
  EMITIDA: "Emitida",
  CANCELADA: "Cancelada",
} as const satisfies Record<string, InvoiceEstatus>;

export const INVOICE_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  [INVOICE_STATUS.BORRADOR]: {
    label: "Borrador",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  [INVOICE_STATUS.EMITIDA]: {
    label: "Emitida",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  [INVOICE_STATUS.CANCELADA]: {
    label: "Cancelada",
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
 * `Borrador` SÍ es enviable, por decisión de negocio: las facturas por piezas
 * nacen en Borrador (ningún endpoint las mueve de ahí) y se mandan al cliente
 * para revisión, sin marca de borrador en el documento. El único estado
 * inválido es `Cancelada`.
 *
 * Se declara como conjunto explícito (en vez de `estatus !== "Cancelada"`) para
 * que un estatus nuevo/desconocido del backend NO se trate como enviable por
 * defecto: ante la duda, un comprobante fiscal no debe salir hacia el cliente.
 */
export const INVOICE_SENDABLE_STATUSES: readonly string[] = [
  INVOICE_STATUS.BORRADOR,
  INVOICE_STATUS.EMITIDA,
];

/**
 * ¿La factura está en un estatus en el que puede enviarse por correo al
 * cliente? Fuente única para la habilitación de la acción "Enviar correo" en
 * `InvoiceColumns` y para la validación autoritativa del Route Handler de
 * envío. "Descargar PDF" NO la consulta (ver arriba).
 */
export const isInvoiceSendable = (estatus: string | null | undefined): boolean =>
  estatus != null && INVOICE_SENDABLE_STATUSES.includes(estatus);
