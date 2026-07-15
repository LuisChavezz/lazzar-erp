/**
 * Modelo de vista compartido entre el PDF de la factura
 * (`InvoicePdfDocument`) y la plantilla de correo (`InvoiceEmail`).
 *
 * Ambos documentos se construyen A PARTIR DE ESTE MISMO modelo, de modo que el
 * contenido del correo y el del PDF descargable/adjunto NO pueden divergir por
 * construcción: cualquier cambio de formato (moneda, fecha, redondeo, qué
 * renglones se muestran) ocurre una sola vez aquí y se refleja en los dos.
 *
 * Devuelve únicamente primitivos (strings/booleanos/arreglos de strings) sin
 * JSX, para poder consumirse igual desde `@react-pdf/renderer` (`<Text>`) que
 * desde `@react-email/components` (`<td>`), y es una función pura sin APIs de
 * navegador, así que corre tanto en el cliente (generación del PDF) como en
 * Node.js (render del correo en el Route Handler).
 *
 * El correo del cliente (`correo_facturas`) NO forma parte de este modelo:
 * aunque ya viaja en la fila de la factura, es metadato de direccionamiento del
 * envío, no contenido del documento fiscal, así que se mantiene fuera del
 * PDF/correo y solo se usa como destinatario en el flujo de envío.
 */
import type { Invoice } from "../interfaces/invoice.interface";
import {
  formatCurrency,
  formatQuantityValue,
  safeParseAmount,
} from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";

/** Un renglón de la factura, ya formateado para presentación. */
export interface InvoiceDocumentLine {
  descripcion: string;
  cantidad: string;
  precioUnitario: string;
  descuento: string;
  importe: string;
}

/** Modelo de presentación completo de una factura. */
export interface InvoiceDocumentModel {
  folio: string;
  customerName: string;
  statusLabel: string;
  fechaEmision: string;
  fechaVencimiento: string;
  currency: string;
  lines: InvoiceDocumentLine[];
  subtotal: string;
  descuento: string;
  impuestos: string;
  total: string;
  /**
   * El renglón de descuento solo se muestra cuando aporta al total (> 0), igual
   * criterio en PDF y correo, para que ambos reconcilien contra el mismo total.
   */
  showDescuento: boolean;
  observaciones: string | null;
}

export const buildInvoiceDocumentModel = (invoice: Invoice): InvoiceDocumentModel => {
  // Formatea un importe con la moneda de la factura. `formatCurrency` degrada a
  // número plano si `moneda_nombre` no es un código ISO 4217 (p. ej. "Peso
  // Mexicano"), así que es seguro pasar el nombre tal cual lo trae el backend.
  const money = (value: string | number): string =>
    formatCurrency(safeParseAmount(String(value)), { currency: invoice.moneda_nombre });

  // El listado puede no hidratar los conceptos (mismo criterio defensivo que
  // `InvoiceDetails`); `?? []` evita romper el render con un valor ausente.
  const detalles = invoice.factura_detalles ?? [];

  return {
    folio: invoice.folio,
    customerName: invoice.cliente_nombre || "-",
    statusLabel: invoice.estatus,
    fechaEmision: formatLocalDate(invoice.fecha_emision),
    fechaVencimiento: formatLocalDate(invoice.fecha_vencimiento),
    currency: invoice.moneda_nombre,
    lines: detalles.map((detalle) => ({
      descripcion: detalle.producto_nombre,
      cantidad: formatQuantityValue(detalle.cantidad),
      precioUnitario: money(detalle.precio_unitario),
      descuento: money(detalle.descuento),
      importe: money(detalle.total),
    })),
    subtotal: money(invoice.subtotal),
    descuento: money(invoice.descuento),
    impuestos: money(invoice.impuestos),
    total: money(invoice.total),
    showDescuento: safeParseAmount(invoice.descuento) > 0,
    observaciones: invoice.observaciones,
  };
};
