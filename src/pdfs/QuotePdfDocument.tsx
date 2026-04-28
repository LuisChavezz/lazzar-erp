/**
 * Documento PDF de cotizacion individual.
 * Responsabilidad: estructura visual del documento, solo presentacional.
 * Usa la API de @react-pdf/renderer exclusivamente.
 *
 * Estilos → QuotePdfStyles.ts
 * Colores → QuotePdfColors.ts
 */
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import type { QuotePdfModel } from "../features/quotes/utils/quotePdfTemplateHelpers";
import { OPCION_LABEL, POSICION_LABEL, TIPO_LABEL } from "../features/quotes/utils/reflective-labels";
import { pdfStyles as s } from "./QuotePdfStyles";

type QuotePdfDocumentProps = {
  quote: QuoteById;
  model: QuotePdfModel;
};

export const QuotePdfDocument = ({ quote, model }: QuotePdfDocumentProps) => {
  const { customerName, totalPieces, shippingAddress, detailRows, computedSubtotal, detailAddons } = model;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Encabezado ── */}
        <View style={s.header} wrap={false}>
          <View style={s.headerLeft}>
            <Text style={s.brandLabel}>ERP LAZZAR</Text>
            <Text style={s.docTitle}>Cotización</Text>
            <Text style={s.docSubtitle}>{customerName}</Text>
          </View>
          <View style={s.headerRight}>
            <View style={s.quoteIdBadge}>
              <Text style={s.quoteIdText}>#{quote.id}</Text>
            </View>
            <View style={s.statusBadge}>
              <Text style={s.statusText}>{quote.estatus_label?.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* ── Info general ── */}
        <View style={s.twoCol} wrap={false}>
          {/* Cliente */}
          <View style={s.card}>
            <Text style={s.cardTitle}>DATOS DEL CLIENTE</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Razón social</Text>
              <Text style={s.infoValue}>{quote.cliente_razon_social || "-"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Contacto</Text>
              <Text style={s.infoValue}>{quote.cliente_nombre || "-"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Correo</Text>
              <Text style={s.infoValue}>{quote.correo_facturas || "-"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Persona de pagos</Text>
              <Text style={s.infoValue}>{quote.persona_pagos || "-"}</Text>
            </View>
          </View>

          {/* Pedido */}
          <View style={s.card}>
            <Text style={s.cardTitle}>DATOS DEL PEDIDO</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Fecha</Text>
              <Text style={s.infoValue}>{model.formattedDate}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>OC</Text>
              <Text style={s.infoValue}>{quote.oc || "-"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Forma de pago</Text>
              <Text style={s.infoValue}>{quote.forma_pago || "-"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Uso CFDI</Text>
              <Text style={s.infoValue}>{quote.uso_cfdi || "-"}</Text>
            </View>
          </View>
        </View>

        {/* ── Envío ── */}
        {shippingAddress !== "-" && (
          <View style={s.shippingCard} wrap={false}>
            <Text style={s.cardTitle}>DIRECCIÓN DE ENVÍO</Text>
            <View style={s.shippingField}>
              <Text style={s.shippingLabel}>Destinatario</Text>
              <Text style={s.shippingValue}>{quote.destinatario || "-"}</Text>
            </View>
            <View style={[s.shippingField, s.shippingFieldLast]}>
              <Text style={s.shippingLabel}>Dirección</Text>
              <Text style={s.shippingValue}>{shippingAddress}</Text>
            </View>
          </View>
        )}

        {/* ── Tabla de productos ── */}
        <Text style={s.sectionTitle}>PRODUCTOS COTIZADOS</Text>
        <View>
          {/* Encabezado de la tabla — se repite en cada página */}
          <View style={s.tableHeader} fixed>
            <Text style={[s.tableHeaderCell, s.colProduct]}>Producto</Text>
            <Text style={[s.tableHeaderCell, s.colSizes]}>Tallas</Text>
            <Text style={[s.tableHeaderCell, s.colQty]}>Pzas.</Text>
            <Text style={[s.tableHeaderCell, s.colPrice]}>Precio u.</Text>
            <Text style={[s.tableHeaderCell, s.colSubtotal]}>Subtotal</Text>
          </View>

          {detailRows.map(({ detail, quantity, lineSubtotal }, i) => {
            const addons = detailAddons[i];
            const hasEmbroidery = addons.embroideryGroups.length > 0;
            const hasReflective = addons.reflectiveGroups.length > 0;

            return (
              <View key={detail.id}>
                {/* Fila principal del producto */}
                <View style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]} wrap={false}>
                  <Text style={[s.tableCellBold, s.colProduct]}>{detail.producto_nombre}</Text>
                  <Text style={[s.tableCell, s.colSizes]}>{model.sizesSummaries[i]}</Text>
                  <Text style={[s.tableCell, s.colQty]}>{quantity}</Text>
                  <Text style={[s.tableCell, s.colPrice]}>
                    {model.formatMoney(Number(detail.precio_unitario))}
                  </Text>
                  <Text style={[s.tableCellBold, s.colSubtotal]}>
                    {model.formatMoney(lineSubtotal)}
                  </Text>
                </View>

                {/* ── Sección de bordados ── */}
                {hasEmbroidery && (
                  <View style={s.addonSection} wrap={false}>
                    <View style={s.addonSectionHeaderEmbroidery}>
                      <Text style={s.addonSectionHeaderTextEmbroidery}>
                        BORDADOS DEL PRODUCTO
                      </Text>
                    </View>

                    <View style={s.addonBody}>
                      {addons.embroideryGroups.map((group, gi) => (
                        <View key={gi} wrap={false}>
                          {/* Header del grupo */}
                          <View style={s.embGroupHeader}>
                            <Text style={s.embGroupLabel}>{group.label}</Text>
                            <Text style={s.embGroupSizes}>
                              Tallas: {group.sizeNames.join(", ")}
                            </Text>
                          </View>

                          {/* Notas */}
                          {group.notes ? (
                            <Text style={s.embGroupNotes}>Notas: {group.notes}</Text>
                          ) : null}

                          {/* Tarjetas de ubicaciones — grid 2 columnas */}
                          <View style={s.embLocationsGrid}>
                            {group.locations.map((loc, li) => (
                              <View key={li} style={s.embLocationCard} wrap={false}>
                                <View style={s.embLocationInfo}>
                                  <Text style={s.embLocationTitle}>
                                    Ubicación {loc.codigo}
                                  </Text>
                                  <Text style={s.embLocationDetail}>
                                    Medidas: {loc.ancho_cm} x {loc.alto_cm} cm
                                  </Text>
                                  <Text style={s.embLocationDetail}>
                                    Hilo: {loc.color_hilo || "Sin especificar"}
                                  </Text>
                                </View>
                                <View style={s.embLocationImageBox}>
                                  {loc.imagen ? (
                                    // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer no tiene prop alt; imagen decorativa en PDF
                                    <Image
                                      src={loc.imagen}
                                      style={s.embLocationImage}
                                    />
                                  ) : (
                                    <View style={s.embLocationImagePlaceholder}>
                                      <Text style={s.embLocationImagePlaceholderText}>
                                        Sin imagen
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── Sección de reflejantes ── */}
                {hasReflective && (
                  <View style={s.addonSection} wrap={false}>
                    <View style={s.addonSectionHeaderReflective}>
                      <Text style={s.addonSectionHeaderTextReflective}>
                        REFLEJANTES DEL PRODUCTO
                      </Text>
                    </View>
                    <View style={[s.addonBody, { paddingBottom: 6 }]}>
                      {addons.reflectiveGroups.map((group, gi) => (
                        <View key={gi} style={s.reflGroupWrapper} wrap={false}>
                          <View style={s.reflGroupHeader}>
                            <Text style={s.reflGroupHeaderLabel}>
                              Configuración {gi + 1}
                            </Text>
                            <Text style={s.reflGroupSizes}>
                              Tallas: {group.sizeNames.join(", ")}
                            </Text>
                          </View>
                          <View style={s.reflSpecsRow}>
                            {group.specs.map((spec, si) => (
                              <View key={si} style={s.reflSpecBadge}>
                                <Text style={s.reflSpecLabel}>OPCIÓN</Text>
                                <Text style={s.reflSpecValue}>
                                  {OPCION_LABEL[spec.opcion] ?? spec.opcion}
                                </Text>
                                <Text style={[s.reflSpecLabel, { marginTop: 3 }]}>POSICIÓN</Text>
                                <Text style={s.reflSpecValue}>
                                  {POSICION_LABEL[spec.posicion] ?? spec.posicion}
                                </Text>
                                <Text style={[s.reflSpecLabel, { marginTop: 3 }]}>TIPO</Text>
                                <Text style={s.reflSpecValue}>
                                  {TIPO_LABEL[spec.tipo] ?? spec.tipo}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── Indicador de corte de manga ── */}
                {addons.hasSleeveCut && (
                  <View style={[s.addonSection, s.addonSectionHeaderSleeve]} wrap={false}>
                    <View style={s.sleeveBadge}>
                      <View style={s.sleeveBadgeDot} />
                      <Text style={s.sleeveBadgeText}>INCLUYE CORTE DE MANGA</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Totales ── */}
        <View style={s.totalsSection} wrap={false}>
          <View style={s.totalsCard}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Piezas totales</Text>
              <Text style={s.totalsValue}>{totalPieces}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsValue}>{model.formatMoney(computedSubtotal)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>IVA ({quote.iva}%)</Text>
              <Text style={s.totalsValue}>
                {model.formatMoney((computedSubtotal * quote.iva) / 100)}
              </Text>
            </View>
            {Number(quote.anticipo) > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Anticipo</Text>
                <Text style={s.totalsValue}>
                  {model.formatMoney(Number(quote.anticipo))}
                </Text>
              </View>
            )}
            <View style={s.totalsRowFinal}>
              <Text style={s.totalsFinalLabel}>TOTAL</Text>
              <Text style={s.totalsFinalValue}>
                {model.formatMoney(Number(quote.gran_total))}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Observaciones ── */}
        {quote.observaciones ? (
          <View style={s.obsCard} wrap={false}>
            <Text style={s.cardTitle}>OBSERVACIONES</Text>
            <Text style={s.obsText}>{quote.observaciones}</Text>
          </View>
        ) : null}

        {/* ── Pie de página ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Cotización #{quote.id} — {customerName}
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};