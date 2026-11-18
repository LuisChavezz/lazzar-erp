/**
 * Piezas comunes de los PDF de Finanzas (EC-859): factura, nota de crédito,
 * factura de proveedor, cobro, pago y póliza. Módulo puro, sin
 * `@react-pdf/renderer` (solo sus tipos).
 *
 * Todo se lee de la respuesta del backend: ningún importe ni saldo se
 * recalcula. Finanzas no quita importes por rol, así que aquí no hay columnas
 * ligadas a una clave ausente (`PdfColumn.field`).
 */
import { formatInvoiceTipoCambio } from "@/src/features/invoicing/utils/invoiceCurrency";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate, formatShortDateTime } from "@/src/utils/formatDate";
import { requiresTipoCambio } from "@/src/utils/tipoCambio";
import { textOrDash } from "@/src/utils/textOrDash";
import type { PdfInfoItem } from "./DocumentPdfLayout";

/**
 * Formateador de importes en la moneda del documento (código ISO, p. ej.
 * `moneda_nombre`). Sin código, sin símbolo: nunca pesos por defecto (EC-606).
 */
export const pdfMoney =
  (monedaCodigo: string | null | undefined) =>
  (value: string | number): string =>
    formatMoneyValue(value, monedaCodigo?.trim() || null);

/** Fecha-calendario ("YYYY-MM-DD") como "14 jul 2026", sin correr el día. */
export const pdfDate = (value: string | null | undefined): string => formatShortCalendarDate(value);

/** Fecha y hora de un timestamp ("14 jul 2026 · 10:32"). */
export const pdfDateTime = (value: string | null | undefined): string => formatShortDateTime(value);

/**
 * Renglones "Moneda" y, fuera de MXN, "Tipo de cambio" (pesos por unidad, de
 * la respuesta; "Sin capturar" si viene `null`). En MXN el tipo de cambio es 1
 * y no se imprime, como en el detalle de la factura. Solo para documentos que
 * TRAEN tipo de cambio (factura, nota de crédito, cobro); el pago no lo tiene.
 */
export const pdfCurrencyItems = (
  monedaCodigo: string | null | undefined,
  tipoCambio: string | null | undefined,
): PdfInfoItem[] => {
  const codigo = (monedaCodigo ?? "").trim().toUpperCase();
  const items: PdfInfoItem[] = [{ label: "Moneda", value: textOrDash(codigo) }];
  if (codigo && requiresTipoCambio(codigo)) {
    items.push({
      label: "Tipo de cambio",
      value: tipoCambio ? `${formatInvoiceTipoCambio(tipoCambio)} MXN por ${codigo}` : "Sin capturar",
    });
  }
  return items;
};

/**
 * Estado de un CFDI timbrado (factura o REP), de sus banderas: no es un
 * estatus del documento. Mismas etiquetas en los dos PDF (EC-859).
 */
export const CFDI_STATE_LABELS = {
  vigente: "Vigente",
  cancelacionSolicitada: "Cancelación solicitada ante el SAT",
  cancelado: "Cancelado ante el SAT",
  pendiente: "Timbrado pendiente de confirmar",
} as const;

export const pdfCfdiState = (flags: { cancelado: boolean; cancelacionSolicitada: boolean }): string =>
  flags.cancelado
    ? CFDI_STATE_LABELS.cancelado
    : flags.cancelacionSolicitada
      ? CFDI_STATE_LABELS.cancelacionSolicitada
      : CFDI_STATE_LABELS.vigente;
