import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import {
  formatQuoteDateTime,
  toCurrencyOrDash,
  toDisplayValue,
} from "@/src/features/quotes/utils/quoteDetailsFormatters";
import {
  buildQuoteEmailTemplateModel,
  getQuoteDetailSizesSummary,
} from "@/src/features/quotes/utils/quoteEmailTemplateHelpers";

type QuotePdfProps = {
  quote: QuoteById;
};

export const QuotePdf = ({ quote }: QuotePdfProps) => {
  const { customerName, totalPieces, shippingAddress, detailRows, computedSubtotal } =
    buildQuoteEmailTemplateModel(quote);

  return (
    <Html lang="es">
      <Tailwind>
        <Head />
        <Body className="m-0 bg-white py-6 font-sans text-slate-900">
          <Container className="mx-auto max-w-2xl">
            {/* Encabezado */}
            <Section className="rounded-[20px] bg-slate-950 px-6 py-5 text-white">
              <Text className="m-0 text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                ERP Lazzar
              </Text>
              <Heading className="m-0 mt-3 text-[28px] font-semibold leading-[1.2] text-white">
                Cotizacion #{quote.id}
              </Heading>
              <Text className="m-0 mt-2 text-sm leading-6 text-slate-300">
                Detalle comercial del pedido generado para revision y archivo.
              </Text>
            </Section>

            {/* Resumen */}
            <Section className="mt-6 rounded-[20px] border border-slate-200 px-6 py-5">
              <Heading as="h2" className="m-0 text-lg font-semibold text-slate-900">
                Resumen
              </Heading>
              <table className="mt-4 w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Cliente</td>
                    <td className="py-2 font-medium text-slate-900">{toDisplayValue(customerName)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Razon social</td>
                    <td className="py-2 font-medium text-slate-900">
                      {toDisplayValue(quote.cliente_razon_social)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Estado</td>
                    <td className="py-2 font-medium text-slate-900">
                      {toDisplayValue(quote.estatus_label)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Fecha</td>
                    <td className="py-2 font-medium text-slate-900">
                      {formatQuoteDateTime(quote.created_at)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Uso CFDI</td>
                    <td className="py-2 font-medium text-slate-900">{toDisplayValue(quote.uso_cfdi)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">OC</td>
                    <td className="py-2 font-medium text-slate-900">{toDisplayValue(quote.oc)}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Productos */}
            <Section className="mt-6 rounded-[20px] border border-slate-200 px-6 py-5">
              <Heading as="h2" className="m-0 text-lg font-semibold text-slate-900">
                Productos cotizados
              </Heading>
              <table className="mt-4 w-full border-collapse overflow-hidden text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <th className="py-3 pr-3 font-semibold">Producto</th>
                    <th className="py-3 pr-3 font-semibold">Tallas</th>
                    <th className="py-3 pr-3 font-semibold text-right">Piezas</th>
                    <th className="py-3 pr-3 font-semibold text-right">Precio</th>
                    <th className="py-3 font-semibold text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map(({ detail, quantity, lineSubtotal }, detailIndex) => {
                    const rowClassName =
                      detailIndex < detailRows.length - 1 ? "border-b border-slate-100" : "";

                    return (
                      <tr key={detail.id} className={rowClassName}>
                        <td className="py-4 pr-3 align-top text-slate-900">
                          <Text className="m-0 text-sm font-semibold text-slate-900">
                            {detail.producto_nombre}
                          </Text>
                        </td>
                        <td className="py-4 pr-3 align-top text-slate-600">
                          {getQuoteDetailSizesSummary(detail)}
                        </td>
                        <td className="py-4 pr-3 text-right align-top text-slate-900">{quantity}</td>
                        <td className="py-4 pr-3 text-right align-top text-slate-900">
                          {toCurrencyOrDash(detail.precio_unitario)}
                        </td>
                        <td className="py-4 text-right align-top font-semibold text-slate-900">
                          {toCurrencyOrDash(lineSubtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Section>

            {/* Totales */}
            <Section className="mt-6 rounded-[20px] border border-slate-200 px-6 py-5">
              <Heading as="h2" className="m-0 text-lg font-semibold text-slate-900">
                Totales y seguimiento
              </Heading>
              <table className="mt-4 w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Piezas totales</td>
                    <td className="py-2 text-right font-medium text-slate-900">{totalPieces}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Subtotal</td>
                    <td className="py-2 text-right font-medium text-slate-900">
                      {toCurrencyOrDash(computedSubtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">IVA</td>
                    <td className="py-2 text-right font-medium text-slate-900">{quote.iva}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Anticipo</td>
                    <td className="py-2 text-right font-medium text-slate-900">
                      {toCurrencyOrDash(quote.anticipo)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Total</td>
                    <td className="py-2 text-right text-lg font-semibold text-slate-950">
                      {toCurrencyOrDash(quote.gran_total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Contacto y envio */}
            <Section className="mt-6 rounded-[20px] border border-slate-200 px-6 py-5">
              <Heading as="h2" className="m-0 text-lg font-semibold text-slate-900">
                Datos de contacto y envio
              </Heading>
              <table className="mt-4 w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Persona de pagos</td>
                    <td className="py-2 font-medium text-slate-900">
                      {toDisplayValue(quote.persona_pagos)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Correo de facturas</td>
                    <td className="py-2 font-medium text-slate-900">
                      {toDisplayValue(quote.correo_facturas)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Forma de pago</td>
                    <td className="py-2 font-medium text-slate-900">
                      {toDisplayValue(quote.forma_pago)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Metodo de pago</td>
                    <td className="py-2 font-medium text-slate-900">
                      {toDisplayValue(quote.metodo_pago)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Destinatario</td>
                    <td className="py-2 font-medium text-slate-900">
                      {toDisplayValue(quote.destinatario)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-slate-500">Direccion de envio</td>
                    <td className="py-2 font-medium text-slate-900">{shippingAddress}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Observaciones (condicional) */}
            {quote.observaciones ? (
              <Section className="mt-6 rounded-[20px] border border-slate-200 px-6 py-5">
                <Heading as="h2" className="m-0 text-lg font-semibold text-slate-900">
                  Observaciones
                </Heading>
                <Text className="m-0 mt-4 text-sm leading-6 text-slate-700">{quote.observaciones}</Text>
              </Section>
            ) : null}

            <Hr className="my-8 border-slate-200" />

            <Text className="m-0 text-xs leading-5 text-slate-500">
              Documento generado automaticamente desde el modulo de cotizaciones del ERP.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default QuotePdf;
