/**
 * Documento PDF de cotizacion individual.
 * Responsabilidad: estructura visual del documento, solo presentacional.
 * Usa la API de @react-pdf/renderer exclusivamente.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";
import { QuotePdfModel } from "../features/quotes/utils/quotePdfTemplateHelpers";

const COLORS = {
  brand: "#0f172a",
  accent: "#0ea5e9",
  accentDark: "#0369a1",
  white: "#ffffff",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  rowAlt: "#f8fafc",
  success: "#059669",
  badge: "#f0f9ff",
  badgeBorder: "#bae6fd",
  badgeText: "#0369a1",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },

  /* ── Encabezado ──────────────────────────────── */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brand,
  },
  headerLeft: {
    flex: 1,
  },
  brandLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.accent,
    letterSpacing: 2,
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.brand,
    marginBottom: 2,
  },
  docSubtitle: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  quoteIdBadge: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  quoteIdText: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },
  statusBadge: {
    backgroundColor: COLORS.badge,
    borderWidth: 1,
    borderColor: COLORS.badgeBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.badgeText,
  },

  /* ── Info general (2 columnas) ──────────────── */
  twoCol: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
  },
  cardTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 5,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    flex: 1,
  },
  infoValue: {
    fontSize: 8,
    color: COLORS.textPrimary,
    fontFamily: "Helvetica-Bold",
    flex: 2,
    textAlign: "right",
  },
  shippingCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  shippingField: {
    marginBottom: 8,
  },
  shippingFieldLast: {
    marginBottom: 0,
  },
  shippingLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginBottom: 3,
  },
  shippingValue: {
    fontSize: 8.5,
    color: COLORS.textPrimary,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.35,
  },

  /* ── Sección de productos ───────────────────── */
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.brand,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.brand,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 0,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tableRowAlt: {
    backgroundColor: COLORS.rowAlt,
  },
  tableCell: {
    fontSize: 8,
    color: COLORS.textSecondary,
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
  },
  colProduct: { flex: 3 },
  colSizes: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colSubtotal: { flex: 1.5, textAlign: "right" },

  /* ── Totales ─────────────────────────────────── */
  totalsSection: {
    marginTop: 10,
    alignItems: "flex-end",
  },
  totalsCard: {
    width: "42%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: "hidden",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  totalsRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.brand,
  },
  totalsLabel: {
    fontSize: 8,
    color: COLORS.textSecondary,
  },
  totalsValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textPrimary,
  },
  totalsFinalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textMuted,
  },
  totalsFinalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
  },

  /* ── Observaciones ───────────────────────────── */
  obsCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
  },
  obsText: {
    fontSize: 8,
    color: COLORS.textSecondary,
    lineHeight: 1.5,
  },

  /* ── Pie de página ───────────────────────────── */
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.textMuted,
  },
});

type QuotePdfDocumentProps = {
  quote: QuoteById;
  model: QuotePdfModel;
};

export const QuotePdfDocument = ({ quote, model }: QuotePdfDocumentProps) => {
  const { customerName, totalPieces, shippingAddress, detailRows, computedSubtotal } = model;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Encabezado ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandLabel}>ERP LAZZAR</Text>
            <Text style={styles.docTitle}>Cotización</Text>
            <Text style={styles.docSubtitle}>{customerName}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.quoteIdBadge}>
              <Text style={styles.quoteIdText}>#{quote.id}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{quote.estatus_label?.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* ── Info general ── */}
        <View style={styles.twoCol}>
          {/* Cliente */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>DATOS DEL CLIENTE</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Razón social</Text>
              <Text style={styles.infoValue}>{quote.cliente_razon_social || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contacto</Text>
              <Text style={styles.infoValue}>{quote.cliente_nombre || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Correo</Text>
              <Text style={styles.infoValue}>{quote.correo_facturas || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Persona de pagos</Text>
              <Text style={styles.infoValue}>{quote.persona_pagos || "-"}</Text>
            </View>
          </View>

          {/* Pedido */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>DATOS DEL PEDIDO</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha</Text>
              <Text style={styles.infoValue}>{model.formattedDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>OC</Text>
              <Text style={styles.infoValue}>{quote.oc || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Forma de pago</Text>
              <Text style={styles.infoValue}>{quote.forma_pago || "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Uso CFDI</Text>
              <Text style={styles.infoValue}>{quote.uso_cfdi || "-"}</Text>
            </View>
          </View>
        </View>

        {/* Envío */}
        {shippingAddress !== "-" && (
          <View style={styles.shippingCard}>
            <Text style={styles.cardTitle}>DIRECCIÓN DE ENVÍO</Text>
            <View style={styles.shippingField}>
              <Text style={styles.shippingLabel}>Destinatario</Text>
              <Text style={styles.shippingValue}>{quote.destinatario || "-"}</Text>
            </View>
            <View style={[styles.shippingField, styles.shippingFieldLast]}>
              <Text style={styles.shippingLabel}>Dirección</Text>
              <Text style={styles.shippingValue}>{shippingAddress}</Text>
            </View>
          </View>
        )}

        {/* ── Tabla de productos ── */}
        <Text style={styles.sectionTitle}>PRODUCTOS COTIZADOS</Text>
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colProduct]}>Producto</Text>
            <Text style={[styles.tableHeaderCell, styles.colSizes]}>Tallas</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Pzas.</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio u.</Text>
            <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>Subtotal</Text>
          </View>

          {detailRows.map(({ detail, quantity, lineSubtotal }, i) => (
            <View
              key={detail.id}
              style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.tableCellBold, styles.colProduct]}>
                {detail.producto_nombre}
              </Text>
              <Text style={[styles.tableCell, styles.colSizes]}>
                {model.sizesSummaries[i]}
              </Text>
              <Text style={[styles.tableCell, styles.colQty]}>{quantity}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>
                {model.formatMoney(Number(detail.precio_unitario))}
              </Text>
              <Text style={[styles.tableCellBold, styles.colSubtotal]}>
                {model.formatMoney(lineSubtotal)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Totales ── */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Piezas totales</Text>
              <Text style={styles.totalsValue}>{totalPieces}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{model.formatMoney(computedSubtotal)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IVA ({quote.iva}%)</Text>
              <Text style={styles.totalsValue}>
                {model.formatMoney((computedSubtotal * quote.iva) / 100)}
              </Text>
            </View>
            {Number(quote.anticipo) > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Anticipo</Text>
                <Text style={styles.totalsValue}>
                  {model.formatMoney(Number(quote.anticipo))}
                </Text>
              </View>
            )}
            <View style={styles.totalsRowFinal}>
              <Text style={styles.totalsFinalLabel}>TOTAL</Text>
              <Text style={styles.totalsFinalValue}>
                {model.formatMoney(Number(quote.gran_total))}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Observaciones ── */}
        {quote.observaciones ? (
          <View style={styles.obsCard}>
            <Text style={styles.cardTitle}>OBSERVACIONES</Text>
            <Text style={styles.obsText}>{quote.observaciones}</Text>
          </View>
        ) : null}

        {/* ── Pie de página ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Cotización #{quote.id} — {customerName}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};
