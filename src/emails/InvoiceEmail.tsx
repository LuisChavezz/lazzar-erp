import { Fragment } from "react";
import { Text } from "@react-email/components";
import { BaseEmailLayout, EmailCard } from "@/src/emails/shared/BaseEmailLayout";
import type { Invoice } from "@/src/features/invoicing/interfaces/invoice.interface";
import { buildInvoiceDocumentModel } from "@/src/features/invoicing/utils/invoiceDocumentModel";

type InvoiceEmailProps = {
  invoice: Invoice;
  /** Correo del cliente al que se dirige la factura (destinatario). */
  correo: string;
};

/**
 * Correo dirigido al CLIENTE con su factura adjunta en PDF.
 *
 * El cuerpo se construye a partir del MISMO modelo compartido que el PDF
 * (`buildInvoiceDocumentModel`), de modo que el resumen del correo y el PDF
 * adjunto no pueden divergir. El desglose completo vive en el PDF adjunto
 * (ver `InvoicePdfDocument`); aquí se ofrece un vistazo rápido de folio,
 * estatus, fechas, conceptos y totales.
 *
 * El `estatus` se INCLUYE (a diferencia del correo de orden de compra) porque
 * en una factura es información fiscal/de pago relevante para el cliente.
 */
export const InvoiceEmail = ({ invoice, correo }: InvoiceEmailProps) => {
  const model = buildInvoiceDocumentModel(invoice);

  return (
    <BaseEmailLayout
      previewText={`Factura ${model.folio} para ${model.customerName}`}
      headingText={`Factura ${model.folio}`}
      descriptionText={
        <>
          Estimado {model.customerName}, adjuntamos en PDF su factura con el detalle de los
          conceptos. Quedamos atentos a cualquier aclaración.
        </>
      }
      footerText={`Este correo fue enviado a ${correo} desde el módulo de facturación. El detalle completo de la factura se encuentra en el PDF adjunto.`}
    >
      <EmailCard title="Resumen">
        <table className="mt-4 w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Folio</td>
                    <td className="py-2 font-medium text-slate-900">{model.folio}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Cliente</td>
                    <td className="py-2 font-medium text-slate-900">{model.customerName}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Estatus</td>
                    <td className="py-2 font-medium text-slate-900">{model.statusLabel}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Fecha de emisión</td>
                    <td className="py-2 font-medium text-slate-900">{model.fechaEmision}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Fecha de vencimiento</td>
                    <td className="py-2 font-medium text-slate-900">{model.fechaVencimiento}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Moneda</td>
                    <td className="py-2 font-medium text-slate-900">{model.currency || "-"}</td>
                  </tr>
                </tbody>
              </table>
      </EmailCard>

      <EmailCard title="Conceptos">
              <table className="mt-4 w-full border-collapse overflow-hidden text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <th className="py-3 pr-3 font-semibold">Descripción</th>
                    <th className="py-3 pr-3 font-semibold text-right">Cantidad</th>
                    <th className="py-3 pr-3 font-semibold text-right">Precio u.</th>
                    <th className="py-3 font-semibold text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {model.lines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        Esta factura no tiene conceptos registrados.
                      </td>
                    </tr>
                  ) : (
                    model.lines.map((line, index) => {
                      const isNotLast = index < model.lines.length - 1;
                      const dividerClass = isNotLast ? "border-b border-slate-100" : "";
                      return (
                        <Fragment key={index}>
                          <tr className={dividerClass}>
                            <td className="py-4 pr-3 align-top text-slate-900">
                              <Text className="m-0 text-sm font-semibold text-slate-900">
                                {line.descripcion}
                              </Text>
                            </td>
                            <td className="py-4 pr-3 text-right align-top text-slate-900">
                              {line.cantidad}
                            </td>
                            <td className="py-4 pr-3 text-right align-top text-slate-900">
                              {line.precioUnitario}
                            </td>
                            <td className="py-4 text-right align-top font-semibold text-slate-900">
                              {line.importe}
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
      </EmailCard>

      <EmailCard title="Totales">
              <table className="mt-4 w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Subtotal</td>
                    <td className="py-2 text-right font-medium text-slate-900">{model.subtotal}</td>
                  </tr>
                  {model.showDescuento ? (
                    <tr>
                      <td className="py-2 pr-4 text-slate-500">Descuento</td>
                      <td className="py-2 text-right font-medium text-slate-900">
                        {model.descuento}
                      </td>
                    </tr>
                  ) : null}
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Impuestos</td>
                    <td className="py-2 text-right font-medium text-slate-900">{model.impuestos}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Total</td>
                    <td className="py-2 text-right text-lg font-semibold text-slate-950">
                      {model.total}
                    </td>
                  </tr>
                </tbody>
              </table>
      </EmailCard>

      {model.observaciones?.trim() ? (
        <EmailCard title="Observaciones">
          <Text className="m-0 mt-4 text-sm leading-6 text-slate-700">
            {model.observaciones}
          </Text>
        </EmailCard>
      ) : null}
    </BaseEmailLayout>
  );
};

export default InvoiceEmail;
