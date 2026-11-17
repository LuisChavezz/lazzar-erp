/**
 * Documento PDF de una nota de crédito, sobre la plantilla base
 * `DocumentPdfLayout` (EC-859).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que trae `GET /finanzas/notas-credito/{id}/` (EC-904), tal cual:
 *
 * - Datos de la nota: estatus, motivo, moneda y —fuera de MXN— tipo de cambio,
 *   los de su factura (la nota no guarda moneda propia).
 * - Factura relacionada: folio y folio fiscal (UUID).
 * - Comprobante fiscal, si está timbrada: folio fiscal y fecha de timbrado.
 *   El PDF del ERP no es el CFDI; el oficial se baja con "Descargar CFDI".
 * - Conceptos acreditados: producto (o servicio extra) y talla —la columna
 *   solo si algún renglón la trae: un servicio extra no tiene—, cantidad,
 *   precio, impuesto e importe (`total` del renglón). Las líneas son
 *   documentales: el backend no las suma.
 * - Totales guardados (subtotal, impuestos y total) y observaciones.
 *
 * Una `Cancelada` lleva la marca "CANCELADA" (`creditNotePdfDescriptor`).
 * Nada se recalcula.
 */
import type { NotaCredito, NotaCreditoDetalle } from "@/src/features/credit-notes/interfaces/credit-note.interface";
import { creditNotePdfDescriptor } from "@/src/features/credit-notes/utils/creditNotePdf";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { EMPTY_VALUE, textOrDash } from "@/src/utils/textOrDash";
import {
  DocumentPdfLayout,
  PdfCardRow,
  PdfCellText,
  PdfInfoCard,
  PdfLineItemsTable,
  PdfNotes,
  PdfTotals,
  type PdfColumn,
} from "./shared/DocumentPdfLayout";
import { conditionalColumn } from "./shared/documentPdfColumns";
import type { PdfCompany } from "./shared/documentPdfModel";
import { pdfCurrencyItems, pdfDate, pdfDateTime, pdfMoney } from "./shared/financeDocumentPdf";

type CreditNotePdfDocumentProps = {
  nota: NotaCredito;
  company: PdfCompany | null;
};

export const CreditNotePdfDocument = ({ nota, company }: CreditNotePdfDocumentProps) => {
  const detalles = nota.nota_credito_detalles ?? [];
  const money = pdfMoney(nota.moneda_nombre);
  const cliente = nota.cliente_nombre?.trim() || EMPTY_VALUE;

  const columns: PdfColumn<NotaCreditoDetalle>[] = [
    {
      id: "concepto",
      header: "Concepto",
      flex: 4,
      cell: (line) => <PdfCellText bold>{textOrDash(line.producto_nombre)}</PdfCellText>,
    },
    ...conditionalColumn(detalles, (line) => line.talla_nombre, {
      id: "talla",
      header: "Talla",
      flex: 1,
      cell: (line) => textOrDash(line.talla_nombre),
    }),
    { id: "cantidad", header: "Cantidad", flex: 1.2, align: "right", cell: (line) => formatQuantityValue(line.cantidad) },
    { id: "precio", header: "Precio u.", flex: 1.6, align: "right", cell: (line) => money(line.precio_unitario) },
    { id: "impuesto", header: "Impuesto", flex: 1.5, align: "right", cell: (line) => money(line.impuesto) },
    { id: "importe", header: "Importe", flex: 1.7, align: "right", bold: true, cell: (line) => money(line.total) },
  ];

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={creditNotePdfDescriptor(nota)}
      title="Nota de crédito"
      subtitle={cliente}
      date={{ label: "Emisión", value: pdfDate(nota.fecha_emision) }}
      statusBanner={
        nota.cfdi_uuid || nota.cfdi_pendiente
          ? { title: "REPRESENTACIÓN NO FISCAL", detail: "Este documento no sustituye al CFDI de egreso timbrado ante el SAT." }
          : null
      }
      footerDetail={cliente}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DE LA NOTA"
          items={[
            { label: "Cliente", value: cliente },
            { label: "Estatus", value: nota.estatus },
            { label: "Motivo", value: textOrDash(nota.motivo) },
            ...pdfCurrencyItems(nota.moneda_nombre, nota.tipo_cambio),
          ]}
        />
        <PdfInfoCard
          title="FACTURA RELACIONADA"
          items={[
            { label: "Folio", value: textOrDash(nota.factura_folio) },
            { label: "Folio fiscal", value: textOrDash(nota.factura_uuid) },
          ]}
        />
      </PdfCardRow>

      {nota.cfdi_uuid ? (
        <PdfCardRow>
          <PdfInfoCard
            title="COMPROBANTE FISCAL (CFDI DE EGRESO)"
            items={[
              { label: "Folio fiscal", value: nota.cfdi_uuid },
              { label: "Timbrado", value: pdfDateTime(nota.cfdi_fecha_timbrado) },
            ]}
          />
        </PdfCardRow>
      ) : null}

      <PdfLineItemsTable
        title="CONCEPTOS ACREDITADOS"
        rows={detalles}
        columns={columns}
        emptyMessage="Esta nota no detalla conceptos de la factura."
      />

      <PdfTotals
        rows={[
          { label: "Subtotal", value: money(nota.subtotal) },
          { label: "Impuestos", value: money(nota.impuestos) },
          { label: "TOTAL", value: money(nota.total), emphasis: true },
        ]}
      />

      <PdfNotes text={nota.observaciones} />
    </DocumentPdfLayout>
  );
};
