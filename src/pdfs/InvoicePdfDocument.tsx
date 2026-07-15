/**
 * Documento PDF de una factura.
 * Responsabilidad: estructura visual del documento, solo presentacional.
 * Usa la API de @react-pdf/renderer exclusivamente.
 *
 * Estilos → InvoicePdfStyles.ts
 * Colores → InvoicePdfColors.ts
 * Datos   → buildInvoiceDocumentModel (compartido con InvoiceEmail)
 *
 * ─── DECISIÓN DE CONTENIDO ───────────────────────────────────────────────────
 * Este documento representa la factura emitida al CLIENTE: encabezado (folio,
 * estatus, cliente, moneda, fecha de emisión y vencimiento), los conceptos
 * (`factura_detalles[]`) y el resumen financiero.
 *
 * A diferencia del PDF de orden de compra —que OMITE el estatus por ser un
 * estado de flujo interno irrelevante para el proveedor— aquí el `estatus`
 * SÍ se incluye: es información fiscal y de pago relevante para el cliente,
 * igual que el PDF de cotización muestra su estatus.
 *
 * Ese badge es además lo que permite que la descarga NO se condicione al
 * estatus (a diferencia del envío por correo): una factura `Cancelada` puede
 * descargarse como registro interno precisamente porque el documento se rotula
 * a sí mismo como CANCELADA y no puede confundirse con un comprobante vigente.
 * Si se llegara a omitir el badge, habría que reinstalar la compuerta en la
 * descarga (ver `InvoiceColumns`).
 *
 * El correo del cliente NO se muestra en el PDF: es metadato de
 * direccionamiento del envío, no contenido del comprobante, y no viaja en la
 * fila de la factura con la que se genera la descarga.
 */
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { Invoice } from "@/src/features/invoicing/interfaces/invoice.interface";
import { buildInvoiceDocumentModel } from "@/src/features/invoicing/utils/invoiceDocumentModel";
import { invoicePdfStyles as s } from "./InvoicePdfStyles";

type InvoicePdfDocumentProps = {
  invoice: Invoice;
};

export const InvoicePdfDocument = ({ invoice }: InvoicePdfDocumentProps) => {
  const model = buildInvoiceDocumentModel(invoice);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Encabezado ── */}
        <View style={s.header} wrap={false}>
          <View style={s.headerLeft}>
            <Text style={s.brandLabel}>ERP LAZZAR</Text>
            <Text style={s.docTitle}>Factura</Text>
            <Text style={s.docSubtitle}>{model.customerName}</Text>
          </View>
          <View style={s.headerRight}>
            <View style={s.folioBadge}>
              <Text style={s.folioText}>{model.folio}</Text>
            </View>
            <View style={s.statusBadge}>
              <Text style={s.statusText}>{model.statusLabel.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* ── Info general ── */}
        <View style={s.twoCol} wrap={false}>
          {/* Cliente */}
          <View style={s.card}>
            <Text style={s.cardTitle}>DATOS DEL CLIENTE</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Cliente</Text>
              <Text style={s.infoValue}>{model.customerName}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Moneda</Text>
              <Text style={s.infoValue}>{model.currency || "-"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Estatus</Text>
              <Text style={s.infoValue}>{model.statusLabel}</Text>
            </View>
          </View>

          {/* Factura */}
          <View style={s.card}>
            <Text style={s.cardTitle}>DATOS DE LA FACTURA</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Folio</Text>
              <Text style={s.infoValue}>{model.folio}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Fecha de emisión</Text>
              <Text style={s.infoValue}>{model.fechaEmision}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Fecha de vencimiento</Text>
              <Text style={s.infoValue}>{model.fechaVencimiento}</Text>
            </View>
          </View>
        </View>

        {/* ── Tabla de conceptos ── */}
        <Text style={s.sectionTitle}>CONCEPTOS</Text>
        <View>
          {/* Encabezado de la tabla — se repite en cada página */}
          <View style={s.tableHeader} fixed>
            <Text style={[s.tableHeaderCell, s.colDescription]}>Descripción</Text>
            <Text style={[s.tableHeaderCell, s.colQty]}>Cantidad</Text>
            <Text style={[s.tableHeaderCell, s.colPrice]}>Precio u.</Text>
            <Text style={[s.tableHeaderCell, s.colDiscount]}>Descuento</Text>
            <Text style={[s.tableHeaderCell, s.colAmount]}>Importe</Text>
          </View>

          {model.lines.length === 0 ? (
            <View style={s.emptyRow}>
              <Text style={s.emptyText}>Esta factura no tiene conceptos registrados.</Text>
            </View>
          ) : (
            model.lines.map((line, i) => (
              <View
                key={i}
                style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={[s.tableCellBold, s.colDescription]}>{line.descripcion}</Text>
                <Text style={[s.tableCell, s.colQty]}>{line.cantidad}</Text>
                <Text style={[s.tableCell, s.colPrice]}>{line.precioUnitario}</Text>
                <Text style={[s.tableCell, s.colDiscount]}>{line.descuento}</Text>
                <Text style={[s.tableCellBold, s.colAmount]}>{line.importe}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Totales ── */}
        <View style={s.totalsSection} wrap={false}>
          <View style={s.totalsCard}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsValue}>{model.subtotal}</Text>
            </View>
            {model.showDescuento && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Descuento</Text>
                <Text style={s.totalsValue}>{model.descuento}</Text>
              </View>
            )}
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Impuestos</Text>
              <Text style={s.totalsValue}>{model.impuestos}</Text>
            </View>
            <View style={s.totalsRowFinal}>
              <Text style={s.totalsFinalLabel}>TOTAL</Text>
              <Text style={s.totalsFinalValue}>{model.total}</Text>
            </View>
          </View>
        </View>

        {/* ── Observaciones ── */}
        {model.observaciones?.trim() ? (
          <View style={s.obsCard} wrap={false}>
            <Text style={s.cardTitle}>OBSERVACIONES</Text>
            <Text style={s.obsText}>{model.observaciones}</Text>
          </View>
        ) : null}

        {/* ── Pie de página ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Factura {model.folio} — {model.customerName}
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
