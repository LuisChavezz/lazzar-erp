/**
 * Construcción del contenido del correo de una factura.
 * Aquí solo se define cómo obtener asunto, HTML y texto plano a partir de la
 * factura y el correo del cliente. El envío real ocurre en otra capa (Gmail).
 */
import { createElement } from "react";
import { render, toPlainText } from "@react-email/render";
import InvoiceEmail from "@/src/emails/InvoiceEmail";
import { buildInvoiceDocumentModel } from "../../utils/invoiceDocumentModel";
import type { Invoice } from "../../interfaces/invoice.interface";

/**
 * Construye el asunto del correo a partir del folio y el nombre del cliente.
 *
 * Los toma del MISMO modelo compartido que alimentan el cuerpo del correo y el
 * PDF (`buildInvoiceDocumentModel`), en vez de leer la factura por su cuenta:
 * así el asunto no puede divergir del cuerpo (p. ej. mostrar un fallback
 * distinto cuando `cliente_nombre` viene vacío). Cualquier cambio de formato o
 * de fallback ocurre una sola vez, en el modelo.
 */
export const buildInvoiceEmailSubject = (invoice: Invoice) => {
  const model = buildInvoiceDocumentModel(invoice);

  return `Factura ${model.folio} - ${model.customerName}`;
};

/**
 * Renderiza la plantilla React Email a HTML y genera su equivalente en texto
 * plano para compatibilidad con clientes que prefieren texto sin formato.
 */
export const buildInvoiceEmailContent = async (invoice: Invoice, correo: string) => {
  const html = await render(createElement(InvoiceEmail, { invoice, correo }));

  return {
    html,
    text: toPlainText(html),
  };
};
