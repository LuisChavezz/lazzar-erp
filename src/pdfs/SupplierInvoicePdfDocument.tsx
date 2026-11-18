/**
 * Documento PDF de una factura de proveedor, sobre la plantilla base
 * `DocumentPdfLayout` (EC-859).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que trae `GET /finanzas/facturas-proveedor/{id}/` (EC-904), tal cual:
 *
 * - Proveedor y datos de la factura: estatus, emisión, vencimiento, moneda,
 *   orden de compra y recepción de origen. Las facturas de proveedor no
 *   registran tipo de cambio ni UUID.
 * - Renglones: código del producto (solo si algún renglón lo trae), producto,
 *   cantidad, precio, descuento, impuesto e importe (`total` del renglón).
 * - Totales guardados (subtotal, descuento si es mayor a cero, impuestos y
 *   total) y observaciones.
 *
 * Es el documento del ERP: se genera con o sin el PDF del proveedor adjunto
 * (ese va en "Descargar OC + RC + factura"). Una `Cancelada` lleva la marca
 * "CANCELADA". Nada se recalcula.
 */
import type {
  FacturaProveedor,
  FacturaProveedorDetalle,
} from "@/src/features/supplier-invoices/interfaces/supplier-invoice.interface";
import { supplierInvoicePdfDescriptor } from "@/src/features/supplier-invoices/utils/supplierInvoicePdf";
import { formatQuantityValue, safeParseAmount } from "@/src/utils/formatCurrency";
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
import { pdfDate, pdfMoney } from "./shared/financeDocumentPdf";
import { SIN_OC_LABEL } from "@/src/features/supplier-invoices/utils/supplierInvoiceLabels";

type SupplierInvoicePdfDocumentProps = {
  factura: FacturaProveedor;
  company: PdfCompany | null;
};

export const SupplierInvoicePdfDocument = ({ factura, company }: SupplierInvoicePdfDocumentProps) => {
  const detalles = factura.factura_proveedor_detalles ?? [];
  const money = pdfMoney(factura.moneda_codigo);
  const proveedor = factura.proveedor_nombre?.trim() || EMPTY_VALUE;

  const columns: PdfColumn<FacturaProveedorDetalle>[] = [
    ...conditionalColumn(detalles, (line) => line.producto_codigo, {
      id: "codigo",
      header: "Código",
      flex: 1.6,
      cell: (line) => textOrDash(line.producto_codigo),
    }),
    {
      id: "producto",
      header: "Producto",
      flex: 4,
      cell: (line) => <PdfCellText bold>{line.producto_nombre?.trim() || `Producto #${line.producto}`}</PdfCellText>,
    },
    { id: "cantidad", header: "Cantidad", flex: 1.2, align: "right", cell: (line) => formatQuantityValue(line.cantidad) },
    { id: "precio", header: "Precio u.", flex: 1.6, align: "right", cell: (line) => money(line.precio_unitario) },
    { id: "descuento", header: "Descuento", flex: 1.5, align: "right", cell: (line) => money(line.descuento) },
    { id: "impuesto", header: "Impuesto", flex: 1.5, align: "right", cell: (line) => money(line.impuesto) },
    { id: "importe", header: "Importe", flex: 1.7, align: "right", bold: true, cell: (line) => money(line.total) },
  ];

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={supplierInvoicePdfDescriptor(factura)}
      title="Factura de proveedor"
      subtitle={proveedor}
      date={{ label: "Emisión", value: pdfDate(factura.fecha_emision) }}
      footerDetail={proveedor}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DE LA FACTURA"
          items={[
            { label: "Proveedor", value: proveedor },
            { label: "Estatus", value: factura.estatus },
            { label: "Vencimiento", value: pdfDate(factura.fecha_vencimiento) },
            { label: "Moneda", value: textOrDash(factura.moneda_codigo) },
          ]}
        />
        <PdfInfoCard
          title="ORIGEN"
          items={[
            // Sin OC: factura de maquila de una SM (EC-912).
            {
              label: "Orden de compra",
              value: factura.oc == null ? SIN_OC_LABEL : textOrDash(factura.oc_folio),
            },
            { label: "Recepción", value: textOrDash(factura.recepcion_folio) },
          ]}
        />
      </PdfCardRow>

      <PdfLineItemsTable
        title="RENGLONES"
        rows={detalles}
        columns={columns}
        emptyMessage="Esta factura no tiene renglones registrados."
      />

      <PdfTotals
        rows={[
          { label: "Subtotal", value: money(factura.subtotal) },
          { label: "Descuento", value: safeParseAmount(factura.descuento) > 0 ? money(factura.descuento) : undefined },
          { label: "Impuestos", value: money(factura.impuestos) },
          { label: "TOTAL", value: money(factura.total), emphasis: true },
        ]}
      />

      <PdfNotes text={factura.observaciones} />
    </DocumentPdfLayout>
  );
};
