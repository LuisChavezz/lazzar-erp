/**
 * Documento PDF del reporte de movimientos de inventario por periodo.
 * Responsabilidad: estructura visual del documento, solo presentacional.
 * Usa la API de @react-pdf/renderer exclusivamente.
 *
 * Estilos → StockMovementReportPdfStyles.ts
 * Colores → StockMovementReportPdfColors.ts
 *
 * Espejo del PDF de existencias: la "entidad" es TODO el conjunto filtrado
 * (cientos o miles de filas). Orientación horizontal y auto-paginado de
 * @react-pdf: el encabezado de la tabla lleva `fixed` (se repite en cada
 * página) y cada fila `wrap={false}` (no se parte).
 */
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { StockMovementReportResponse } from "@/src/features/stock/interfaces/stock-movement-report.interface";
// Se reutiliza el MISMO mapa de etiquetas por tipo de movimiento del módulo de
// movimientos (usado también por `StockMovementReportColumns`), en vez de
// re-declararlo aquí.
import { MOVEMENT_TYPE_CONFIG } from "@/src/features/stock-movements/components/StockMovementsColumns";
import { formatMoneyValue, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatLocalDate, formatShortDate } from "@/src/utils/formatDate";
import { stockMovementReportPdfStyles as s } from "./StockMovementReportPdfStyles";

type StockMovementReportPdfDocumentProps = {
  report: StockMovementReportResponse;
};

// Formato de hora, espejo de `StockMovementReportColumns` (no existe un util
// compartido de fecha+hora en el proyecto).
function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const StockMovementReportPdfDocument = ({
  report,
}: StockMovementReportPdfDocumentProps) => {
  const { resumen, results } = report;

  const tipoLabel =
    MOVEMENT_TYPE_CONFIG[report.tipo_movimiento]?.label ?? report.tipo_movimiento;

  // El almacén es opcional: la respuesta solo trae `filtros.almacen_id` (sin
  // nombre). Igual que `StockReportPdfDocument`, el nombre se resuelve desde
  // las filas ya traídas (todas comparten almacén cuando se filtró por uno) en
  // vez de mostrar el ID crudo; si no hay filas que lo confirmen (periodo sin
  // movimientos), se cae al ID como último recurso. Se muestra "Todos los
  // almacenes" cuando no se filtró.
  const almacenLabel =
    report.filtros?.almacen_id != null
      ? (results.find((r) => r.almacen_id === report.filtros.almacen_id)
          ?.almacen_nombre ?? `Almacén #${report.filtros.almacen_id}`)
      : "Todos los almacenes";

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
            <Text style={s.docTitle}>Reporte de Movimientos de Inventario</Text>
            <Text style={s.docSubtitle}>
              {tipoLabel} · {almacenLabel}
            </Text>
          </View>
        </View>

        {/* ── Info general ── */}
        <View style={s.twoCol} wrap={false}>
          <View style={s.card}>
            <Text style={s.cardTitle}>FILTROS DEL REPORTE</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Tipo de movimiento</Text>
              <Text style={s.infoValue}>{tipoLabel}</Text>
            </View>
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
            <Text style={s.summaryLabel}>TOTAL MOVIMIENTOS</Text>
            <Text style={s.summaryValue}>
              {formatQuantityValue(resumen.total_movimientos)}
            </Text>
          </View>
          <View style={s.summaryCell}>
            <Text style={s.summaryLabel}>TOTAL REGISTROS</Text>
            <Text style={s.summaryValue}>
              {formatQuantityValue(resumen.total_registros)}
            </Text>
          </View>
          <View style={s.summaryCell}>
            <Text style={s.summaryLabel}>CANTIDAD TOTAL</Text>
            <Text style={s.summaryValue}>
              {formatQuantityValue(resumen.total_cantidad)}
            </Text>
          </View>
        </View>

        {/* ── Tabla de movimientos ── */}
        <Text style={s.sectionTitle}>DETALLE DE MOVIMIENTOS</Text>
        <View>
          {/* Encabezado de la tabla — se repite en cada página (`fixed`) */}
          <View style={s.tableHeader} fixed>
            <Text style={[s.tableHeaderCell, s.colFecha]}>Fecha</Text>
            <Text style={[s.tableHeaderCell, s.colTipo]}>Tipo</Text>
            <Text style={[s.tableHeaderCell, s.colProducto]}>Producto</Text>
            <Text style={[s.tableHeaderCell, s.colAlmacen]}>Almacén</Text>
            <Text style={[s.tableHeaderCell, s.colUbicacion]}>Ubicación</Text>
            <Text style={[s.tableHeaderCell, s.colCantidad]}>Cantidad</Text>
            <Text style={[s.tableHeaderCell, s.colCosto]}>Costo Total</Text>
            <Text style={[s.tableHeaderCell, s.colUsuario]}>Usuario</Text>
          </View>

          {results.length === 0 ? (
            <View style={s.tableRow}>
              <Text style={s.tableCell}>Sin movimientos en el periodo.</Text>
            </View>
          ) : (
            results.map((row, i) => (
              <View
                key={row.movimiento_detalle_id}
                style={[s.tableRow, i % 2 !== 0 ? s.tableRowAlt : {}]}
                wrap={false}
              >
                <View style={s.colFecha}>
                  <Text style={s.tableCellBold}>
                    {formatShortDate(row.fecha_movimiento)}
                  </Text>
                  <Text style={s.tableCellSub}>
                    {formatTime(row.fecha_movimiento)}
                  </Text>
                </View>
                <Text style={[s.tableCell, s.colTipo]}>
                  {MOVEMENT_TYPE_CONFIG[row.tipo_movimiento]?.label ?? row.tipo_movimiento}
                </Text>
                <Text style={[s.tableCell, s.colProducto]}>
                  {row.producto_nombre || row.producto_base_nombre || "—"}
                </Text>
                <Text style={[s.tableCell, s.colAlmacen]}>
                  {row.almacen_nombre || "—"}
                </Text>
                <Text style={[s.tableCell, s.colUbicacion]}>
                  {row.ubicacion_nombre || "—"}
                </Text>
                <Text style={[s.tableCellBold, s.colCantidad]}>
                  {formatQuantityValue(row.cantidad)}
                </Text>
                <Text style={[s.tableCell, s.colCosto]}>
                  {formatMoneyValue(row.costo_total)}
                </Text>
                <Text style={[s.tableCell, s.colUsuario]}>
                  {row.usuario_nombre || "—"}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ── Pie de página ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Reporte de Movimientos — {tipoLabel} · {almacenLabel}
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
