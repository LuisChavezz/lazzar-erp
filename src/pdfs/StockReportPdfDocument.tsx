/**
 * Documento PDF del reporte de inventario (existencias por periodo).
 * Responsabilidad: estructura visual del documento, solo presentacional.
 * Usa la API de @react-pdf/renderer exclusivamente.
 *
 * Estilos → StockReportPdfStyles.ts
 * Colores → StockReportPdfColors.ts
 *
 * A diferencia de los PDF de cotización / orden de compra (una entidad con unos
 * pocos renglones), aquí la "entidad" es TODO el conjunto filtrado: puede tener
 * cientos o miles de filas. Se usa orientación horizontal (11 columnas) y se
 * confía en el auto-paginado de @react-pdf: el encabezado de la tabla lleva
 * `fixed` (se repite en cada página) y cada fila `wrap={false}` (no se parte).
 */
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { StockReportResponse } from "@/src/features/stock/interfaces/stock-report.interface";
import {
  formatMoneyValue as money,
  formatQuantityValue,
} from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { stockReportPdfStyles as s } from "./StockReportPdfStyles";

type StockReportPdfDocumentProps = {
  report: StockReportResponse;
};

export const StockReportPdfDocument = ({ report }: StockReportPdfDocumentProps) => {
  const { resumen, results } = report;

  // Almacén del reporte: con el gate de un solo almacén, `resumen_por_almacen`
  // tiene una sola entrada; se cae a la primera fila si no viniera.
  const almacen = report.resumen_por_almacen?.[0];
  const almacenLabel = almacen
    ? `${almacen.almacen_nombre} (${almacen.almacen_codigo})`
    : results[0]?.almacen_nombre ?? "—";

  const generatedAt = new Date().toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const periodo = `${formatLocalDate(report.fecha_inicio)} — ${formatLocalDate(report.fecha_final)}`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* ── Encabezado ── */}
        <View style={s.header} wrap={false}>
          <View style={s.headerLeft}>
            <Text style={s.brandLabel}>ERP LAZZAR</Text>
            <Text style={s.docTitle}>Reporte de Inventario</Text>
            <Text style={s.docSubtitle}>{almacenLabel}</Text>
          </View>
        </View>

        {/* ── Info general ── */}
        <View style={s.twoCol} wrap={false}>
          <View style={s.card}>
            <Text style={s.cardTitle}>FILTROS DEL REPORTE</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Almacén</Text>
              <Text style={s.infoValue}>{almacenLabel}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Periodo</Text>
              <Text style={s.infoValue}>{periodo}</Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>GENERACIÓN</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Registros totales</Text>
              <Text style={s.infoValue}>{report.count.toLocaleString("es-MX")}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Generado el</Text>
              <Text style={s.infoValue}>{generatedAt}</Text>
            </View>
          </View>
        </View>

        {/* ── Resumen del periodo (NO paginado: totales del periodo completo) ── */}
        <Text style={s.sectionTitle}>RESUMEN DEL PERIODO</Text>
        <View style={s.summaryRow} wrap={false}>
          <View style={s.summaryCell}>
            <Text style={s.summaryLabel}>EXIST. INICIAL</Text>
            <Text style={s.summaryValue}>{formatQuantityValue(resumen.existencia_inicial)}</Text>
          </View>
          <View style={s.summaryCell}>
            <Text style={s.summaryLabel}>ENTRADAS</Text>
            <Text style={s.summaryValue}>{formatQuantityValue(resumen.entradas)}</Text>
          </View>
          <View style={s.summaryCell}>
            <Text style={s.summaryLabel}>SALIDAS</Text>
            <Text style={s.summaryValue}>{formatQuantityValue(resumen.salidas)}</Text>
          </View>
          <View style={s.summaryCell}>
            <Text style={s.summaryLabel}>EXIST. FINAL</Text>
            <Text style={s.summaryValue}>{formatQuantityValue(resumen.existencia_final)}</Text>
          </View>
          <View style={s.summaryCell}>
            <Text style={s.summaryLabel}>COSTO TOTAL</Text>
            <Text style={s.summaryValue}>
              {money(resumen.costo_total_existencia_final)}
            </Text>
          </View>
        </View>

        {/* ── Tabla de existencias ── */}
        <Text style={s.sectionTitle}>DETALLE DE EXISTENCIAS</Text>
        <View>
          {/* Encabezado de la tabla — se repite en cada página (`fixed`) */}
          <View style={s.tableHeader} fixed>
            <Text style={[s.tableHeaderCell, s.colSku]}>SKU</Text>
            <Text style={[s.tableHeaderCell, s.colProducto]}>Producto</Text>
            <Text style={[s.tableHeaderCell, s.colColor]}>Color</Text>
            <Text style={[s.tableHeaderCell, s.colTalla]}>Talla</Text>
            <Text style={[s.tableHeaderCell, s.colAlmacen]}>Almacén</Text>
            <Text style={[s.tableHeaderCell, s.colNum]}>Exist. Inicial</Text>
            <Text style={[s.tableHeaderCell, s.colNum]}>Entradas</Text>
            <Text style={[s.tableHeaderCell, s.colNum]}>Salidas</Text>
            <Text style={[s.tableHeaderCell, s.colNum]}>Exist. Final</Text>
            <Text style={[s.tableHeaderCell, s.colMoney]}>Costo Unitario</Text>
            <Text style={[s.tableHeaderCell, s.colMoney]}>Costo Total</Text>
          </View>

          {results.length === 0 ? (
            <View style={s.tableRow}>
              <Text style={s.tableCell}>Sin existencias en el periodo.</Text>
            </View>
          ) : (
            results.map((row, i) => (
              <View
                key={`${row.producto_variante_id}-${i}`}
                style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}
                wrap={false}
              >
                <Text style={[s.tableCellBold, s.colSku]}>{row.sku || "—"}</Text>
                <Text style={[s.tableCell, s.colProducto]}>
                  {row.producto_nombre || "—"}
                </Text>
                <Text style={[s.tableCell, s.colColor]}>{row.color || "—"}</Text>
                <Text style={[s.tableCell, s.colTalla]}>{row.talla || "—"}</Text>
                <Text style={[s.tableCell, s.colAlmacen]}>
                  {row.almacen_nombre || "—"}
                </Text>
                <Text style={[s.tableCell, s.colNum]}>{formatQuantityValue(row.existencia_inicial)}</Text>
                <Text style={[s.tableCell, s.colNum]}>{formatQuantityValue(row.entradas)}</Text>
                <Text style={[s.tableCell, s.colNum]}>{formatQuantityValue(row.salidas)}</Text>
                <Text style={[s.tableCellBold, s.colNum]}>{formatQuantityValue(row.existencia_final)}</Text>
                <Text style={[s.tableCell, s.colMoney]}>
                  {money(row.costo_unitario_final)}
                </Text>
                <Text style={[s.tableCellBold, s.colMoney]}>
                  {money(row.costo_existencia_final)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ── Pie de página ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Reporte de Inventario — {almacenLabel}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};
