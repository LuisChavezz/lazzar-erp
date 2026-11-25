/**
 * PDF de un listado exportado (EC-959): una tabla con las columnas visibles y
 * las filas de los criterios vigentes, bajo un encabezado con marca, título y
 * datos de la exportación.
 *
 * Lo usan las 15 exportaciones de listados a PDF (`useListExport` y los hooks
 * `use*PdfExport` de clientes, proveedores, pedidos de Compras, recepciones de
 * OC, órdenes de compra y cotizaciones), siempre por `generateListPdfBlob`, que
 * pasa por `renderPdfBlob`: así salen en Arimo con el respaldo de símbolos
 * (EC-958), reintentan la fuente tras un fallo (EC-942) y llegan sin emoji
 * (`stripPdfEmojiDeep` sobre las props).
 *
 * Recibe el TEXTO final de cada celda (`rows: string[][]`), no los registros:
 * cada exportación lo arma con su propio formateo, y la limpieza de emoji cubre
 * exactamente lo que se imprime.
 *
 * Dos variantes conservan el aspecto que cada exportación ya tenía:
 * - `compact`: los listados de WMS (`useListExport`), letra de 7 pt y filas
 *   que no se parten entre páginas;
 * - `standard`: los demás, letra de 9 pt y datos de la exportación como
 *   etiqueta + valor.
 * En las dos, la fila de cabeceras se repite en cada página (`fixed`).
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { documentPdfFontStack } from "./shared/documentPdfFonts";

export type ListPdfVariant = "compact" | "standard";

export interface ListPdfColumn {
  header: string;
  /** Ancho como porcentaje ("12.5%"), el mismo en cabecera, filas y totales. */
  width: string;
  /** Cabecera y celdas a la derecha (importes, cantidades). */
  align?: "right";
  /** Celdas en negritas y en el color del texto principal (importes). */
  bold?: boolean;
}

/** Un dato del encabezado: "Exportado: 25 de noviembre de 2026". */
export interface ListPdfMetaItem {
  label?: string;
  value: string;
}

/** Fila de totales al final de la tabla: una celda por columna. */
export interface ListPdfTotalRow {
  cells: string[];
  /** Columna con el importe (a la derecha y más grande); las demás son etiqueta. */
  valueIndex: number;
}

export interface ListPdfDocumentProps {
  variant: ListPdfVariant;
  /** Línea pequeña sobre el título ("ERP LAZZAR · WMS"). */
  brand: string;
  title: string;
  meta: ListPdfMetaItem[];
  columns: ListPdfColumn[];
  /** Texto de cada celda, en el orden de `columns`. */
  rows: string[][];
  totalRow?: ListPdfTotalRow | null;
  /** Texto izquierdo del pie; a la derecha va "Página N de M". */
  footer: string;
}

const compact = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 22,
    fontSize: 7,
    color: "#0f172a",
    fontFamily: documentPdfFontStack(),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  brand: { fontSize: 7, color: "#0ea5e9", marginBottom: 3 },
  title: { fontSize: 16, fontWeight: "bold" },
  meta: { fontSize: 7.5, color: "#475569", textAlign: "right", marginTop: 2 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
    minHeight: 18,
  },
  headRow: { backgroundColor: "#1e293b", borderBottomWidth: 0, borderRadius: 3, paddingVertical: 6 },
  odd: { backgroundColor: "#f8fafc" },
  headCell: { fontSize: 6.2, fontWeight: "bold", color: "#cbd5e1", paddingHorizontal: 3 },
  cell: { fontSize: 6.8, color: "#334155", paddingHorizontal: 3 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 5,
  },
  footerText: { fontSize: 6.5, color: "#94a3b8" },
});

const standard = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 28,
    fontSize: 9,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    fontFamily: documentPdfFontStack(),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  brand: { fontSize: 7, color: "#0ea5e9", marginBottom: 4 },
  title: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  metaGroup: { alignItems: "flex-end" },
  metaRow: { flexDirection: "row", marginTop: 3 },
  metaLabel: { fontSize: 7.5, color: "#94a3b8", marginRight: 4 },
  metaValue: { fontSize: 7.5, fontWeight: "bold", color: "#475569" },
  table: { marginTop: 4 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 22,
  },
  headRow: { backgroundColor: "#1e293b", borderBottomWidth: 0, paddingVertical: 8, borderRadius: 4 },
  odd: { backgroundColor: "#f8fafc" },
  last: { borderBottomWidth: 0 },
  headCell: { fontSize: 7, fontWeight: "bold", color: "#94a3b8", paddingHorizontal: 5 },
  cell: { fontSize: 8, color: "#334155", paddingHorizontal: 5 },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: "#1e293b",
    paddingVertical: 7,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  totalLabel: { fontSize: 8, fontWeight: "bold", color: "#0f172a", paddingHorizontal: 5 },
  totalValue: { fontSize: 9, fontWeight: "bold", color: "#0f172a", paddingHorizontal: 5, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  footerText: { fontSize: 7, color: "#94a3b8" },
});

/** Alineación y negritas por columna, iguales en las dos variantes. */
const columnStyles = StyleSheet.create({
  right: { textAlign: "right" },
  bold: { fontWeight: "bold", color: "#0f172a" },
});

/** Las hojas del documento, para la prueba que exige la pila de fuentes en cada `fontFamily`. */
export const listPdfStyles = { compact, standard, columnStyles } as const;

const PageNumber = ({ style }: { style: (typeof compact)["footerText"] }) => (
  <Text
    style={style}
    render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
      `Página ${pageNumber} de ${totalPages}`
    }
  />
);

export function ListPdfDocument({ variant, brand, title, meta, columns, rows, totalRow, footer }: ListPdfDocumentProps) {
  const isCompact = variant === "compact";
  const s = isCompact ? compact : standard;
  const headCell = (column: ListPdfColumn) => [
    s.headCell,
    { width: column.width },
    column.align === "right" ? columnStyles.right : {},
  ];
  const cell = (column: ListPdfColumn) => [
    s.cell,
    { width: column.width },
    column.align === "right" ? columnStyles.right : {},
    column.bold ? columnStyles.bold : {},
  ];

  const table = (
    <>
      <View style={[s.row, s.headRow]} fixed>
        {columns.map((column, i) => (
          <Text key={i} style={headCell(column)}>
            {column.header}
          </Text>
        ))}
      </View>
      {rows.map((cells, r) => (
        <View
          key={r}
          style={[
            s.row,
            r % 2 === 1 ? s.odd : {},
            !isCompact && r === rows.length - 1 ? standard.last : {},
          ]}
          wrap={isCompact ? false : undefined}
        >
          {columns.map((column, i) => (
            <Text key={i} style={cell(column)}>
              {cells[i] ?? ""}
            </Text>
          ))}
        </View>
      ))}
      {totalRow && (
        <View style={standard.totalRow}>
          {columns.map((column, i) => (
            <Text
              key={i}
              style={[i === totalRow.valueIndex ? standard.totalValue : standard.totalLabel, { width: column.width }]}
            >
              {totalRow.cells[i] ?? ""}
            </Text>
          ))}
        </View>
      )}
    </>
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>{brand}</Text>
            <Text style={s.title}>{title}</Text>
          </View>
          {isCompact ? (
            <View>
              {meta.map((item, i) => (
                <Text key={i} style={compact.meta}>
                  {item.label ? `${item.label} ${item.value}` : item.value}
                </Text>
              ))}
            </View>
          ) : (
            <View style={standard.metaGroup}>
              {meta.map((item, i) => (
                <View key={i} style={standard.metaRow}>
                  {item.label ? <Text style={standard.metaLabel}>{item.label}</Text> : null}
                  <Text style={standard.metaValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {isCompact ? table : <View style={standard.table}>{table}</View>}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>{footer}</Text>
          <PageNumber style={s.footerText} />
        </View>
      </Page>
    </Document>
  );
}
