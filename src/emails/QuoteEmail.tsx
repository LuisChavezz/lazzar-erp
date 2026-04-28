import { Fragment } from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
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
import { buildQuoteEmailTemplateModel, getQuoteDetailSizesSummary } from "@/src/features/quotes/utils/quoteEmailTemplateHelpers";
import { OPCION_LABEL, POSICION_LABEL, TIPO_LABEL } from "@/src/features/quotes/utils/reflective-labels";

type QuoteEmailProps = {
  quote: QuoteById;
};

export const QuoteEmail = ({ quote }: QuoteEmailProps) => {
  const { customerName, totalPieces, shippingAddress, detailRows, computedSubtotal, detailAddons } =
    buildQuoteEmailTemplateModel(quote);

  return (
    <Html lang="es">
      <Tailwind>
        <Head />
        <Preview>{`Cotizacion #${quote.id} para ${customerName}`}</Preview>
        <Body className="m-0 bg-slate-100 py-8 font-sans text-slate-900">
          <Container className="mx-auto max-w-170 rounded-3xl bg-white px-8 py-10">
            <Section className="rounded-[20px] bg-slate-950 px-6 py-5 text-white">
              <Text className="m-0 text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                ERP Lazzar
              </Text>
              <Heading className="m-0 mt-3 text-[28px] font-semibold leading-[1.2] text-white">
                Cotizacion #{quote.id}
              </Heading>
              <Text className="m-0 mt-2 text-sm leading-6 text-slate-300">
                Se genero una cotizacion lista para revision con el detalle comercial del pedido.
              </Text>
            </Section>

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
                    const addons = detailAddons[detailIndex];
                    const hasEmbroidery = addons.embroideryGroups.length > 0;
                    const hasReflective = addons.reflectiveGroups.length > 0;
                    const hasAddons = hasEmbroidery || hasReflective || addons.hasSleeveCut;
                    const isNotLast = detailIndex < detailRows.length - 1;
                    const dividerClass = isNotLast ? "border-b border-slate-100" : "";

                    return (
                      <Fragment key={detail.id}>
                        <tr className={hasAddons ? "" : dividerClass}>
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

                        {hasAddons && (
                          <tr className={dividerClass}>
                            <td colSpan={5} className="px-0 pb-4 pt-1">

                              {/* ── Bordados ── */}
                              {hasEmbroidery && (
                                <table
                                  width="100%"
                                  style={{ borderCollapse: "collapse", marginBottom: 6 }}
                                >
                                  <thead>
                                    <tr>
                                      <td
                                        colSpan={2}
                                        className="bg-indigo-950 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-200"
                                      >
                                        Bordados del producto
                                      </td>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {addons.embroideryGroups.map((group, gi) => (
                                      <Fragment key={gi}>
                                        <tr>
                                          <td
                                            colSpan={2}
                                            className="border-t border-indigo-100 bg-indigo-50 px-4 py-2.5"
                                          >
                                            <Text className="m-0 text-[11px] font-semibold text-indigo-900">
                                              {group.label}
                                            </Text>
                                            <Text className="m-0 text-[10px] text-indigo-600">
                                              Tallas: {group.sizeNames.join(", ")}
                                            </Text>
                                            {group.notes ? (
                                              <Text className="m-0 text-[10px] italic text-indigo-500">
                                                {group.notes}
                                              </Text>
                                            ) : null}
                                          </td>
                                        </tr>
                                        {group.locations.map((loc, li) => (
                                          <tr key={li} className="border-t border-indigo-100 bg-white">
                                            <td className="px-4 py-3 align-top">
                                              <Text className="m-0 text-[11px] font-semibold text-slate-800">
                                                Ubicación {loc.codigo}
                                              </Text>
                                              <Text className="m-0 text-[10px] text-slate-500">
                                                {loc.ancho_cm} × {loc.alto_cm} cm
                                                {loc.color_hilo ? ` · Hilo: ${loc.color_hilo}` : ""}
                                              </Text>
                                            </td>
                                            <td
                                              className="px-4 py-3 text-right align-top"
                                              style={{ width: 64 }}
                                            >
                                              {loc.imagen ? (
                                                <Img
                                                  src={loc.imagen}
                                                  alt={`Imagen bordado ${loc.codigo}`}
                                                  width="48"
                                                  height="48"
                                                  style={{ marginLeft: "auto", borderRadius: 6 }}
                                                />
                                              ) : (
                                                <Text className="m-0 text-[10px] text-slate-400">
                                                  Sin imagen
                                                </Text>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </Fragment>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {/* ── Reflejantes ── */}
                              {hasReflective && (
                                <table
                                  width="100%"
                                  style={{ borderCollapse: "collapse", marginBottom: 6 }}
                                >
                                  <thead>
                                    <tr>
                                      <td className="bg-amber-900 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                                        Reflejantes del producto
                                      </td>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {addons.reflectiveGroups.map((group, gi) => (
                                      <Fragment key={gi}>
                                        <tr>
                                          <td className="border-t border-amber-100 bg-amber-50 px-4 py-2.5">
                                            <Text className="m-0 text-[11px] font-semibold text-amber-900">
                                              Configuración {gi + 1}
                                            </Text>
                                            <Text className="m-0 text-[10px] text-amber-700">
                                              Tallas: {group.sizeNames.join(", ")}
                                            </Text>
                                          </td>
                                        </tr>
                                        {group.specs.map((spec, si) => (
                                          <tr key={si} className="border-t border-amber-100 bg-white">
                                            <td className="px-4 py-2.5 text-[11px] text-slate-700">
                                              <Text className="m-0">
                                                <span style={{ fontWeight: 600, color: "#92400e" }}>Opción:</span>{" "}
                                                {OPCION_LABEL[spec.opcion] ?? spec.opcion}
                                                {" · "}
                                                <span style={{ fontWeight: 600, color: "#92400e" }}>Posición:</span>{" "}
                                                {POSICION_LABEL[spec.posicion] ?? spec.posicion}
                                                {" · "}
                                                <span style={{ fontWeight: 600, color: "#92400e" }}>Tipo:</span>{" "}
                                                {TIPO_LABEL[spec.tipo] ?? spec.tipo}
                                              </Text>
                                            </td>
                                          </tr>
                                        ))}
                                      </Fragment>
                                    ))}
                                  </tbody>
                                </table>
                              )}

                              {/* ── Corte de manga ── */}
                              {addons.hasSleeveCut && (
                                <table width="100%" style={{ borderCollapse: "collapse" }}>
                                  <tbody>
                                    <tr>
                                      <td className="border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[11px] font-semibold text-emerald-800">
                                        Incluye corte de manga
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              )}

                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </Section>

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
              Este correo fue generado automaticamente desde el modulo de cotizaciones para validar el diseno del template.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default QuoteEmail;