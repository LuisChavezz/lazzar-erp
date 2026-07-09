/**
 * Documento PDF de una orden de compra.
 * Responsabilidad: estructura visual del documento, solo presentacional.
 * Usa la API de @react-pdf/renderer exclusivamente.
 *
 * Estilos → PurchaseOrderPdfStyles.ts
 * Colores → PurchaseOrderPdfColors.ts
 *
 * ─── DECISIÓN DE CONTENIDO (Fase 1.4) ────────────────────────────────────────
 * Este documento representa "lo que se ordenó al proveedor": encabezado de la
 * orden (folio, fecha, referencia, tipo, entrega estimada), datos del proveedor,
 * los renglones de producto (`detalles[]`) y el resumen financiero.
 *
 * NO se incluyen las recepciones (`recepciones[]`), de forma deliberada. Una
 * orden de compra es el documento de lo solicitado, no un reporte de estado en
 * vivo: mezclar "lo recibido hasta ahora" en el PDF que se envía al proveedor
 * confundiría el propósito del documento (el proveedor necesita saber qué se le
 * pidió, no cuánto lleva entregado la bodega). El avance de recepciones ya se
 * consulta en `PurchaseOrderDetailDialog` para uso interno. Si en el futuro se
 * requiere un documento de "pendiente por surtir", debe ser un documento
 * distinto, no este.
 */
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { PurchaseOrderDetail } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import { formatMoneyValue as money, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { purchaseOrderPdfStyles as s } from "./PurchaseOrderPdfStyles";

type PurchaseOrderPdfDocumentProps = {
  order: PurchaseOrderDetail;
};

export const PurchaseOrderPdfDocument = ({ order }: PurchaseOrderPdfDocumentProps) => {
  const detalles = order.detalles ?? [];
  const descuento = safeParseAmount(order.descuento);
  const flete = safeParseAmount(order.flete);
  const seguros = safeParseAmount(order.seguros);
  const ivaPct = safeParseAmount(order.porcentaje_iva);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Encabezado ── */}
        <View style={s.header} wrap={false}>
          <View style={s.headerLeft}>
            <Text style={s.brandLabel}>ERP LAZZAR</Text>
            <Text style={s.docTitle}>Orden de compra</Text>
            <Text style={s.docSubtitle}>{order.proveedor_nombre || "-"}</Text>
          </View>
          <View style={s.headerRight}>
            <View style={s.folioBadge}>
              <Text style={s.folioText}>{order.folio}</Text>
            </View>
          </View>
        </View>

        {/* ── Info general ── */}
        <View style={s.twoCol} wrap={false}>
          {/* Proveedor */}
          <View style={s.card}>
            <Text style={s.cardTitle}>DATOS DEL PROVEEDOR</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Proveedor</Text>
              <Text style={s.infoValue}>{order.proveedor_nombre || "-"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Correo</Text>
              <Text style={s.infoValue}>{order.proveedor_correo || "-"}</Text>
            </View>
          </View>

          {/* Orden */}
          <View style={s.card}>
            <Text style={s.cardTitle}>DATOS DE LA ORDEN</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Fecha OC</Text>
              <Text style={s.infoValue}>{formatLocalDate(order.fecha_oc)}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Referencia</Text>
              <Text style={s.infoValue}>{order.referencia || "-"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Tipo</Text>
              <Text style={s.infoValue}>{order.tipo || "-"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Entrega estimada</Text>
              <Text style={s.infoValue}>{formatLocalDate(order.fecha_entrega_estimada)}</Text>
            </View>
          </View>
        </View>

        {/* ── Tabla de productos ── */}
        <Text style={s.sectionTitle}>PRODUCTOS SOLICITADOS</Text>
        <View>
          {/* Encabezado de la tabla — se repite en cada página */}
          <View style={s.tableHeader} fixed>
            <Text style={[s.tableHeaderCell, s.colDescription]}>Descripción</Text>
            <Text style={[s.tableHeaderCell, s.colQty]}>Cantidad</Text>
            <Text style={[s.tableHeaderCell, s.colPrice]}>Precio u.</Text>
            <Text style={[s.tableHeaderCell, s.colDiscount]}>Descuento</Text>
            <Text style={[s.tableHeaderCell, s.colAmount]}>Importe</Text>
          </View>

          {detalles.length === 0 ? (
            <View style={s.emptyRow}>
              <Text style={s.emptyText}>Esta orden no tiene productos registrados.</Text>
            </View>
          ) : (
            detalles.map((item, i) => (
              <View
                key={i}
                style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={[s.tableCellBold, s.colDescription]}>{item.descripcion}</Text>
                <Text style={[s.tableCell, s.colQty]}>
                  {item.cantidad.toLocaleString("es-MX")}
                </Text>
                <Text style={[s.tableCell, s.colPrice]}>{money(item.precio)}</Text>
                <Text style={[s.tableCell, s.colDiscount]}>{money(item.descuento)}</Text>
                <Text style={[s.tableCellBold, s.colAmount]}>{money(item.importe)}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Totales ── */}
        <View style={s.totalsSection} wrap={false}>
          <View style={s.totalsCard}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Piezas totales</Text>
              <Text style={s.totalsValue}>{order.total_piezas?.toLocaleString("es-MX") ?? "0"}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsValue}>{money(order.subtotal)}</Text>
            </View>
            {descuento > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Descuento</Text>
                <Text style={s.totalsValue}>{money(order.descuento)}</Text>
              </View>
            )}
            {flete > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Flete</Text>
                <Text style={s.totalsValue}>{money(order.flete)}</Text>
              </View>
            )}
            {seguros > 0 && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Seguros</Text>
                <Text style={s.totalsValue}>{money(order.seguros)}</Text>
              </View>
            )}
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>IVA ({ivaPct}%)</Text>
              <Text style={s.totalsValue}>{money(order.total_iva)}</Text>
            </View>
            <View style={s.totalsRowFinal}>
              <Text style={s.totalsFinalLabel}>TOTAL</Text>
              <Text style={s.totalsFinalValue}>{money(order.gran_total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Observaciones ── */}
        {order.observaciones?.trim() ? (
          <View style={s.obsCard} wrap={false}>
            <Text style={s.cardTitle}>OBSERVACIONES</Text>
            <Text style={s.obsText}>{order.observaciones}</Text>
          </View>
        ) : null}

        {/* ── Pie de página ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Orden de compra {order.folio} — {order.proveedor_nombre || "-"}
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};
