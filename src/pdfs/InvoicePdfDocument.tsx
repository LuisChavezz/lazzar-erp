/**
 * Documento PDF de una factura de cliente, sobre la plantilla base
 * `DocumentPdfLayout` (EC-859; reemplaza al PDF "no fiscal" con estilos propios).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que trae `GET /finanzas/facturas/{id}/`, tal cual:
 *
 * - Receptor fiscal (EC-904): nombre, razón social, RFC, régimen, C.P. y uso de
 *   CFDI, con la regla del timbrado.
 * - Datos de la factura: estatus (no en `Borrador`: esas facturas se le mandan
 *   al cliente), vencimiento, moneda y —fuera de MXN— tipo de cambio, forma y
 *   método de pago (solo con pedido).
 * - Comprobante fiscal, si está timbrada: folio fiscal, fecha de timbrado y
 *   estado del CFDI. El PDF del ERP NO es el CFDI (no lleva sello): lo dice su
 *   banner, y el CFDI oficial se baja aparte con "Descargar CFDI".
 * - Conceptos con talla y tasa de IVA (cada columna solo si algún renglón la
 *   trae), cantidad, precio, descuento e importe (`total` del renglón).
 * - Totales guardados (subtotal, descuento si es mayor a cero, impuestos y
 *   total) y observaciones.
 *
 * Se descarga en todos los estatus. Una `Cancelada` lleva la marca
 * "CANCELADA" (`invoicePdfDescriptor`); una eliminada (`activo = false`), un
 * banner que lo dice. Nada se recalcula.
 */
import { INVOICE_STATUS } from "@/src/features/invoicing/constants/invoiceStatus";
import type { Invoice, InvoiceDetail } from "@/src/features/invoicing/interfaces/invoice.interface";
import { formatTasaImpuesto } from "@/src/features/invoicing/utils/invoiceDocumentModel";
import { invoicePdfDescriptor } from "@/src/features/invoicing/utils/invoicePdf";
import { isInvoicePdfNonFiscal } from "@/src/features/invoicing/utils/invoiceStamping";
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
  type PdfInfoItem,
} from "./shared/DocumentPdfLayout";
import { conditionalColumn, optionalInfoItem } from "./shared/documentPdfColumns";
import type { PdfCompany } from "./shared/documentPdfModel";
import { pdfCfdiState, pdfCurrencyItems, pdfDate, pdfDateTime, pdfMoney } from "./shared/financeDocumentPdf";

type InvoicePdfDocumentProps = {
  invoice: Invoice;
  company: PdfCompany | null;
};

/** "G01 - Adquisición de mercancías": código y etiqueta, sin repetir el código. */
const codeAndName = (code: string | null | undefined, name: string | null | undefined): string => {
  const codigo = code?.trim();
  const nombre = name?.trim();
  if (!codigo) return textOrDash(nombre);
  if (!nombre || nombre === codigo || nombre.startsWith(codigo)) return nombre || codigo;
  return `${codigo} - ${nombre}`;
};

export const InvoicePdfDocument = ({ invoice, company }: InvoicePdfDocumentProps) => {
  const detalles = invoice.factura_detalles ?? [];
  const money = pdfMoney(invoice.moneda_nombre);
  const receptor = invoice.receptor ?? null;
  const cliente = invoice.cliente_nombre || receptor?.nombre || EMPTY_VALUE;
  const stamped = Boolean(invoice.cfdi_uuid);

  const columns: PdfColumn<InvoiceDetail>[] = [
    {
      id: "descripcion",
      header: "Descripción",
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
    ...conditionalColumn(detalles, (line) => line.porcentaje_impuesto, {
      id: "iva",
      header: "IVA",
      flex: 1,
      align: "right",
      cell: (line) => formatTasaImpuesto(line.porcentaje_impuesto),
    }),
    { id: "descuento", header: "Descuento", flex: 1.5, align: "right", cell: (line) => money(line.descuento) },
    { id: "importe", header: "Importe", flex: 1.7, align: "right", bold: true, cell: (line) => money(line.total) },
  ];

  const datosFactura: PdfInfoItem[] = [
    // Sin estatus en Borrador: esas facturas se le mandan al cliente (como el PDF anterior).
    ...(invoice.estatus === INVOICE_STATUS.BORRADOR ? [] : [{ label: "Estatus", value: invoice.estatus }]),
    { label: "Emisión", value: pdfDate(invoice.fecha_emision) },
    { label: "Vencimiento", value: pdfDate(invoice.fecha_vencimiento) },
    ...pdfCurrencyItems(invoice.moneda_nombre, invoice.tipo_cambio),
    ...optionalInfoItem("Forma de pago", invoice.forma_pago ? codeAndName(invoice.forma_pago, invoice.forma_pago_nombre) : null),
    ...optionalInfoItem("Método de pago", invoice.metodo_pago ? codeAndName(invoice.metodo_pago, invoice.metodo_pago_nombre) : null),
  ];

  const statusBanner = !invoice.activo
    ? { title: "FACTURA ELIMINADA", detail: "Esta factura fue eliminada en el ERP." }
    : isInvoicePdfNonFiscal(invoice)
      ? {
          title: "REPRESENTACIÓN NO FISCAL",
          detail: stamped
            ? "Este documento no sustituye al CFDI timbrado ante el SAT."
            : "El timbrado de esta factura está pendiente de confirmar; este documento no es un CFDI.",
        }
      : null;

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={invoicePdfDescriptor(invoice)}
      title="Factura"
      subtitle={cliente}
      date={{ label: "Emisión", value: pdfDate(invoice.fecha_emision) }}
      statusBanner={statusBanner}
      footerDetail={cliente}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="RECEPTOR"
          items={[
            { label: "Cliente", value: cliente },
            ...optionalInfoItem("Razón social", receptor?.razon_social),
            { label: "RFC", value: textOrDash(receptor?.rfc) },
            ...optionalInfoItem(
              "Régimen fiscal",
              receptor?.regimen_fiscal ? codeAndName(receptor.regimen_fiscal.codigo, receptor.regimen_fiscal.descripcion) : null,
            ),
            ...optionalInfoItem("C.P.", receptor?.codigo_postal),
            ...optionalInfoItem("Uso de CFDI", invoice.uso_cfdi ? codeAndName(invoice.uso_cfdi, invoice.uso_cfdi_nombre) : null),
          ]}
        />
        <PdfInfoCard title="DATOS DE LA FACTURA" items={datosFactura} />
      </PdfCardRow>

      {stamped ? (
        <PdfCardRow>
          <PdfInfoCard
            title="COMPROBANTE FISCAL (CFDI)"
            items={[
              { label: "Folio fiscal", value: textOrDash(invoice.cfdi_uuid) },
              { label: "Timbrado", value: pdfDateTime(invoice.cfdi_fecha_timbrado) },
              {
                label: "Estado del CFDI",
                value: pdfCfdiState({
                  cancelado: invoice.cfdi_cancelado,
                  cancelacionSolicitada: invoice.cfdi_cancelacion_solicitada,
                }),
              },
            ]}
          />
        </PdfCardRow>
      ) : null}

      <PdfLineItemsTable
        title="CONCEPTOS"
        rows={detalles}
        columns={columns}
        emptyMessage="Esta factura no tiene conceptos registrados."
      />

      <PdfTotals
        rows={[
          { label: "Subtotal", value: money(invoice.subtotal) },
          // Solo cuando aporta al total, como el PDF anterior y el correo.
          { label: "Descuento", value: safeParseAmount(invoice.descuento) > 0 ? money(invoice.descuento) : undefined },
          { label: "Impuestos", value: money(invoice.impuestos) },
          { label: "TOTAL", value: money(invoice.total), emphasis: true },
        ]}
      />

      <PdfNotes text={invoice.observaciones} />
    </DocumentPdfLayout>
  );
};

