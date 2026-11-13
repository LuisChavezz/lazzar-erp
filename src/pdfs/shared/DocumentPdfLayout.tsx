/**
 * Plantilla base de los documentos PDF (EC-855). Cada documento compone su
 * cuerpo con estas piezas y no repite el marco:
 *
 * - `DocumentPdfLayout`: `<Document>` + `<Page>` con el encabezado (empresa
 *   activa —nombre y RFC—, título, subtítulo, insignia de folio con respaldo
 *   `#id` y fecha), el banner de estatus opcional, la marca de cancelado
 *   (banner con su motivo, marca de agua en cada página y leyenda en el pie) y
 *   el pie paginado "Página X de Y".
 * - `PdfCardRow` + `PdfInfoCard`: tarjetas de datos a dos columnas.
 * - `PdfLineItemsTable`: tabla de renglones con columnas declarativas; una
 *   columna ligada a una clave (`field`) se omite si ningún renglón la trae.
 * - `PdfTotals`: bloque de totales; un renglón sin valor se omite, y el
 *   bloque entero si no queda ninguno.
 * - `PdfNotes`: observaciones.
 *
 * Las reglas puras (columnas y totales visibles, folio, motivo) viven en
 * `documentPdfModel.ts`, sin react-pdf, para poder probarlas.
 */
import type { ReactNode } from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { documentPdfStyles as s } from "./DocumentPdfStyles";
import {
  documentPdfCancelledMark,
  documentPdfCancellationReason,
  documentPdfFolioLabel,
  visiblePdfColumns,
  visiblePdfTotals,
  type DocumentPdfDescriptor,
  type PdfColumnVisibility,
  type PdfCompany,
  type PdfTotalRow,
} from "./documentPdfModel";

// ── Marco del documento ───────────────────────────────────────────────────────

export interface DocumentPdfLayoutProps {
  /** Empresa activa; sin ella el encabezado solo lleva el título. */
  company: PdfCompany | null;
  descriptor: DocumentPdfDescriptor;
  /** Título del documento ("Orden de compra"). También abre el pie. */
  title: string;
  /** Línea bajo el título (p. ej. el proveedor o el cliente). */
  subtitle?: string | null;
  /** Fecha principal del documento, ya formateada, bajo el folio. */
  date?: { label: string; value: string } | null;
  /**
   * Banner informativo de estatus para un documento NO cancelado. Uno
   * cancelado lleva siempre el banner de cancelación en su lugar.
   */
  statusBanner?: { title: string; detail?: string | null } | null;
  /** Texto extra del pie tras "<título> <folio>" (p. ej. el proveedor). */
  footerDetail?: string | null;
  children: ReactNode;
}

export function DocumentPdfLayout({
  company,
  descriptor,
  title,
  subtitle,
  date,
  statusBanner,
  footerDetail,
  children,
}: DocumentPdfLayoutProps) {
  const folioLabel = documentPdfFolioLabel(descriptor.folio, descriptor.id);
  const cancelled = descriptor.cancelled;
  const cancellationReason = documentPdfCancellationReason(descriptor);
  const cancelledMark = documentPdfCancelledMark(descriptor);
  const banner = cancelled
    ? { title: cancelledMark, detail: cancellationReason, detailLabel: "Motivo: " }
    : statusBanner
      ? { title: statusBanner.title, detail: statusBanner.detail?.trim() || null, detailLabel: null }
      : null;

  return (
    <Document title={`${title} ${folioLabel}`} author={company?.name}>
      <Page size="A4" style={s.page}>
        {/* ── Encabezado ── */}
        <View style={s.header} wrap={false}>
          <View style={s.headerLeft}>
            {company ? (
              <>
                <Text style={s.companyName}>{company.name}</Text>
                {company.rfc ? (
                  <Text style={s.companyRfc}>RFC: {company.rfc}</Text>
                ) : (
                  <View style={s.companySpacer} />
                )}
              </>
            ) : null}
            <Text style={s.docTitle}>{title}</Text>
            {subtitle ? <Text style={s.docSubtitle}>{subtitle}</Text> : null}
          </View>
          <View style={s.headerRight}>
            <View style={s.folioBadge}>
              <Text style={s.folioText}>{folioLabel}</Text>
            </View>
            {date ? (
              <Text style={s.headerDate}>
                <Text style={s.headerDateLabel}>{date.label}: </Text>
                {date.value}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Banner de estatus / cancelación ── */}
        {banner ? (
          <View
            style={cancelled ? [s.statusBanner, s.statusBannerCancelled] : s.statusBanner}
            wrap={false}
          >
            <Text
              style={
                cancelled ? [s.statusBannerTitle, s.statusBannerTitleCancelled] : s.statusBannerTitle
              }
            >
              {banner.title}
            </Text>
            {banner.detail ? (
              <Text style={s.statusBannerDetail}>
                {banner.detailLabel ? (
                  <Text style={s.statusBannerDetailLabel}>{banner.detailLabel}</Text>
                ) : null}
                {banner.detail}
              </Text>
            ) : null}
          </View>
        ) : null}

        {children}

        {/* ── Marca de agua (cancelado) — al final para quedar encima ── */}
        {cancelled ? (
          <View style={s.watermarkLayer} fixed>
            <Text style={s.watermarkText}>{cancelledMark}</Text>
          </View>
        ) : null}

        {/* ── Pie de página ── */}
        <View style={s.footer} fixed>
          <Text style={[s.footerText, s.footerTextShrink]}>
            {title} {folioLabel}
            {footerDetail ? ` — ${footerDetail}` : ""}
            {cancelled ? (
              <Text style={s.footerStatus}> · {cancelledMark}</Text>
            ) : null}
          </Text>
          <Text
            style={[s.footerText, s.footerPageNumberFixed]}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// ── Tarjetas de datos ─────────────────────────────────────────────────────────

/** Fila de tarjetas: dos tarjetas lado a lado, o una que crece a lo ancho. */
export function PdfCardRow({ children }: { children: ReactNode }) {
  return (
    <View style={s.twoCol} wrap={false}>
      {children}
    </View>
  );
}

export interface PdfInfoItem {
  label: string;
  value: string;
}

export function PdfInfoCard({ title, items }: { title: string; items: readonly PdfInfoItem[] }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item.label} style={s.infoRow}>
          <Text style={s.infoLabel}>{item.label}</Text>
          <Text style={s.infoValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Tabla de renglones ────────────────────────────────────────────────────────

export interface PdfColumn<Row> extends PdfColumnVisibility<Row> {
  id: string;
  header: string;
  /** Ancho relativo (`flex`) de la columna. */
  flex: number;
  /** Cantidades e importes a la derecha; el resto a la izquierda. */
  align?: "left" | "right";
  bold?: boolean;
  /**
   * Contenido de la celda. Un texto o número se pinta con el estilo de celda;
   * cualquier otro nodo (varias líneas, p. ej.) se pinta tal cual dentro de la
   * celda.
   */
  cell: (row: Row, index: number) => ReactNode;
}

export interface PdfLineItemsTableProps<Row> {
  title: string;
  rows: readonly Row[];
  columns: readonly PdfColumn<Row>[];
  emptyMessage: string;
}

/** Puntos que deben caber tras el título de una tabla: encabezado + un renglón. */
const TABLE_TITLE_MIN_PRESENCE_AHEAD = 50;

export function PdfLineItemsTable<Row>({
  title,
  rows,
  columns,
  emptyMessage,
}: PdfLineItemsTableProps<Row>) {
  const visible = visiblePdfColumns(columns, rows);

  return (
    <View style={s.section}>
      {/* El título no debe quedar solo al pie de una página: `minPresenceAhead`
          pide que tras él quepan el encabezado de la tabla y su primer renglón
          (~23 + ~22 pt); si no caben, el título pasa a la página siguiente con
          la tabla. Dos detalles de `@react-pdf/layout` (`shouldBreak`):
          - solo salta ANTES de un elemento si hay contenido delante de él en el
            mismo contenedor (`breakingImprovesPresence`), así que este `View`
            vacío, de alto 0, va primero para que el título no sea el primer hijo;
          - los hermanos `fixed` se quedan en la página actual al saltar, por eso
            el encabezado `fixed` sigue DENTRO del `View` de la tabla y no como
            hermano del título.
          Depende de esos internos de react-pdf: si una actualización los cambia,
          lo detecta `tests/unit/document-pdf-table-page-break.spec.ts`, que
          maqueta un documento real. */}
      <View />
      <Text style={s.sectionTitle} minPresenceAhead={TABLE_TITLE_MIN_PRESENCE_AHEAD}>
        {title}
      </Text>
      <View>
        {/* Encabezado de la tabla — se repite en cada página */}
        <View style={s.tableHeader} fixed>
          {visible.map((column) => (
            <Text
              key={column.id}
              style={[
                s.tableHeaderCell,
                { flex: column.flex },
                ...(column.align === "right" ? [s.cellRight] : []),
              ]}
            >
              {column.header}
            </Text>
          ))}
        </View>

        {rows.length === 0 ? (
          <View style={s.emptyRow}>
            <Text style={s.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          rows.map((row, index) => (
            <View
              key={index}
              style={[s.tableRow, ...(index % 2 !== 0 ? [s.tableRowAlt] : [])]}
              wrap={false}
            >
              {visible.map((column) => {
                const content = column.cell(row, index);
                const cellStyle = [
                  column.bold ? s.tableCellBold : s.tableCell,
                  { flex: column.flex },
                  ...(column.align === "right" ? [s.cellRight] : []),
                ];
                return typeof content === "string" || typeof content === "number" ? (
                  <Text key={column.id} style={cellStyle}>
                    {content}
                  </Text>
                ) : (
                  <View key={column.id} style={{ flex: column.flex }}>
                    {content}
                  </View>
                );
              })}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

/** Texto principal de una celda compuesta (negritas), para usar en `cell`. */
export function PdfCellText({ children, bold = false }: { children: ReactNode; bold?: boolean }) {
  return <Text style={bold ? s.tableCellBold : s.tableCell}>{children}</Text>;
}

/** Línea secundaria pequeña bajo el texto de una celda compuesta. */
export function PdfCellCaption({ children }: { children: ReactNode }) {
  return <Text style={s.cellCaption}>{children}</Text>;
}

// ── Totales ───────────────────────────────────────────────────────────────────

export function PdfTotals({ rows }: { rows: readonly PdfTotalRow[] }) {
  const visible = visiblePdfTotals(rows);
  if (visible.length === 0) return null;

  return (
    <View style={s.totalsSection} wrap={false}>
      <View style={s.totalsCard}>
        {visible.map((row) =>
          row.emphasis ? (
            <View key={row.label} style={s.totalsRowFinal}>
              <Text style={s.totalsFinalLabel}>{row.label}</Text>
              <Text style={s.totalsFinalValue}>{row.value}</Text>
            </View>
          ) : (
            <View key={row.label} style={s.totalsRow}>
              <Text style={s.totalsLabel}>{row.label}</Text>
              <Text style={s.totalsValue}>{row.value}</Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

// ── Observaciones ─────────────────────────────────────────────────────────────

/** Observaciones del documento; no se pinta si el texto viene vacío. */
export function PdfNotes({ title = "OBSERVACIONES", text }: { title?: string; text: string | null | undefined }) {
  const value = text?.trim();
  if (!value) return null;
  return (
    <View style={s.obsCard} wrap={false}>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.obsText}>{value}</Text>
    </View>
  );
}
