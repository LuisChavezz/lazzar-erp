/**
 * Documento PDF de una póliza contable, sobre la plantilla base
 * `DocumentPdfLayout` (EC-859).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que trae `GET /finanzas/polizas/{id}/` (EC-904), tal cual:
 *
 * - Datos de la póliza: tipo, estatus, fecha y concepto; si cuadra
 *   (`cuadre_correcto`, del backend).
 * - Movimientos en el orden del asiento: código y nombre de la cuenta (EC-904;
 *   "Sin cuenta" si la línea la perdió), referencia (solo si algún movimiento
 *   la trae), cargo y abono.
 * - Totales de cargos y abonos del backend.
 *
 * Los asientos no llevan moneda en la respuesta: los importes van sin símbolo,
 * como en el detalle. Una póliza manual puede no tener folio (`#id`,
 * `POL-ID<id>.pdf`). Una `Cancelada` lleva la marca "CANCELADA". Nada se
 * recalcula.
 */
import type { Poliza, PolizaDetalle } from "@/src/features/polizas/interfaces/poliza.interface";
import { polizaMovimientosEnOrden, polizaPdfDescriptor } from "@/src/features/polizas/utils/polizaPdf";
import { textOrDash } from "@/src/utils/textOrDash";
import {
  DocumentPdfLayout,
  PdfCardRow,
  PdfCellText,
  PdfInfoCard,
  PdfLineItemsTable,
  PdfTotals,
  type PdfColumn,
} from "./shared/DocumentPdfLayout";
import { conditionalColumn } from "./shared/documentPdfColumns";
import type { PdfCompany } from "./shared/documentPdfModel";
import { pdfDate, pdfMoney } from "./shared/financeDocumentPdf";

type PolizaPdfDocumentProps = {
  poliza: Poliza;
  company: PdfCompany | null;
};

export const PolizaPdfDocument = ({ poliza, company }: PolizaPdfDocumentProps) => {
  const movimientos = polizaMovimientosEnOrden(poliza.poliza_detalles ?? []);
  // Sin moneda en la respuesta: sin símbolo (nunca pesos por defecto), como el detalle.
  const money = pdfMoney(null);
  const titulo = `Póliza de ${poliza.tipo.toLowerCase()}`;

  const columns: PdfColumn<PolizaDetalle>[] = [
    {
      id: "cuenta",
      header: "Cuenta",
      flex: 1.6,
      cell: (line) => textOrDash(line.cuenta_contable_codigo),
    },
    {
      id: "nombre",
      header: "Nombre de la cuenta",
      flex: 4,
      cell: (line) => <PdfCellText bold>{line.cuenta_contable_nombre?.trim() || "Sin cuenta"}</PdfCellText>,
    },
    ...conditionalColumn(movimientos, (line) => line.referencia, {
      id: "referencia",
      header: "Referencia",
      flex: 2.4,
      cell: (line) => textOrDash(line.referencia),
    }),
    { id: "cargo", header: "Cargo", flex: 1.7, align: "right", cell: (line) => money(line.cargo) },
    { id: "abono", header: "Abono", flex: 1.7, align: "right", cell: (line) => money(line.abono) },
  ];

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={polizaPdfDescriptor(poliza)}
      title={titulo}
      subtitle={poliza.concepto}
      date={{ label: "Fecha", value: pdfDate(poliza.fecha) }}
      statusBanner={
        poliza.cuadre_correcto ? null : { title: "PÓLIZA DESCUADRADA", detail: "Los cargos y los abonos no suman lo mismo." }
      }
      footerDetail={poliza.concepto}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DE LA PÓLIZA"
          items={[
            { label: "Tipo", value: poliza.tipo },
            { label: "Estatus", value: poliza.estatus },
            { label: "Concepto", value: textOrDash(poliza.concepto) },
          ]}
        />
      </PdfCardRow>

      <PdfLineItemsTable
        title="MOVIMIENTOS"
        rows={movimientos}
        columns={columns}
        emptyMessage="Esta póliza no tiene movimientos."
      />

      <PdfTotals
        rows={[
          { label: "Total cargos", value: money(poliza.total_cargos) },
          { label: "Total abonos", value: money(poliza.total_abonos) },
        ]}
      />
    </DocumentPdfLayout>
  );
};
