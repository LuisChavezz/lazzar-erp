"use client";

import { useServerExport } from "@/src/hooks/useServerExport";
import { datedFileName } from "@/src/utils/datedFileName";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { buildListCsv, type ListExportColumn } from "@/src/utils/listExport";

type PdfRenderer = Pick<typeof import("@react-pdf/renderer"), "Document" | "Page" | "Text" | "View" | "StyleSheet">;

interface ListExportOptions<T> {
  /** Filas a exportar, leídas AL EXPORTAR: `getFilteredRows` del ref en modo
   *  cliente o `fetchAllRows` de `useServerTable` en modo servidor. */
  getRows: () => T[] | Promise<T[]>;
  columns: readonly ListExportColumn<T>[];
  /** Título del PDF ("Recepciones"). */
  title: string;
  /** Prefijo del archivo: `<fileName>-AAAA-MM-DD.csv|pdf`. */
  fileName: string;
  /** Línea de conteo del encabezado del PDF; por defecto "N registros". */
  summary?: (rows: T[]) => string;
}

const createListPdf = <T,>(
  { Document, Page, Text, View, StyleSheet }: PdfRenderer,
  { columns, title, summary }: Pick<ListExportOptions<T>, "columns" | "title" | "summary">,
  rows: T[],
  now: Date,
) => {
  const totalWeight = columns.reduce((acc, c) => acc + c.weight, 0);
  const widths = columns.map((c) => `${((c.weight / totalWeight) * 100).toFixed(2)}%`);

  const styles = StyleSheet.create({
    page: { paddingTop: 24, paddingBottom: 40, paddingHorizontal: 22, fontSize: 7, color: "#0f172a" },
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

  const fecha = now.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  const conteo = summary ? summary(rows) : `${rows.length} registro${rows.length === 1 ? "" : "s"}`;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ERP LAZZAR · WMS</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View>
            <Text style={styles.meta}>Exportado: {fecha}</Text>
            <Text style={styles.meta}>{conteo}</Text>
          </View>
        </View>

        <View style={[styles.row, styles.headRow]} fixed>
          {columns.map((c, i) => (
            <Text key={c.header} style={[styles.headCell, { width: widths[i] }]}>
              {c.header}
            </Text>
          ))}
        </View>
        {rows.map((row, r) => (
          <View key={r} style={[styles.row, r % 2 === 1 ? styles.odd : {}]} wrap={false}>
            {columns.map((c, i) => (
              <Text key={c.header} style={[styles.cell, { width: widths[i] }]}>
                {c.text(row)}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generado con ERP Lazzar</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

/**
 * Excel (CSV) y PDF de un listado con EXACTAMENTE las filas que deja ver la
 * tabla (filtros de encabezado, búsqueda y orden vigentes). El toast de
 * progreso y el candado contra doble clic vienen de `useServerExport`.
 */
export const useListExport = <T,>(options: ListExportOptions<T>) => {
  const { getRows, fileName } = options;
  const runCsv = useServerExport(async () => getRows(), `${fileName}-export-csv`);
  const runPdf = useServerExport(async () => getRows(), `${fileName}-export-pdf`);

  const exportCsv = () =>
    runCsv((rows) => {
      const blob = new Blob([buildListCsv(options.columns, rows)], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, datedFileName(fileName, "csv"));
    });

  const exportPdf = () =>
    runPdf(async (rows) => {
      const renderer = await import("@react-pdf/renderer");
      const now = new Date();
      const blob = await renderer.pdf(createListPdf(renderer, options, rows, now)).toBlob();
      downloadBlob(blob, datedFileName(fileName, "pdf", now));
    });

  return { exportCsv, exportPdf };
};
