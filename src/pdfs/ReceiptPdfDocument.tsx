/**
 * Documento PDF de una recepción (desde OC o desde OP), sobre la plantilla base
 * `DocumentPdfLayout` (EC-855/EC-856): el marco (empresa activa, folio, fecha,
 * marca de cancelado, pie paginado) es el de todos los documentos; aquí solo va
 * el cuerpo.
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que muestran los diálogos de detalle (`ReceiptDetailShell`): estatus,
 * origen con el folio de la OC o de la OP (EC-879), proveedor, almacén,
 * sucursal, remisión, factura de referencia, observaciones y los productos
 * recibidos con su SKU (o código de producto), talla, lote, serie y cantidad.
 *
 * - Del proveedor va solo el nombre, como en el PDF de la OC. Una recepción
 *   desde OP no tiene proveedor: sale "—".
 * - Lote y serie son ids de sus FK (el backend no resuelve un código): se
 *   imprimen como los pinta la pantalla. Sus columnas, y la de talla, solo
 *   aparecen si algún renglón trae el dato.
 * - Una recepción no tiene importes ni moneda: no hay nada que ocultar por rol.
 */
import { View } from "@react-pdf/renderer";
import type { ReceiptDetail, ReceiptDetailLine } from "@/src/features/receipts/interfaces/receipt.interface";
import { receiptOrigin, receiptPdfDescriptor } from "@/src/features/receipts/utils/receiptPdf";
import {
  formatCantidadRecibida,
  totalCantidadRecibida,
} from "@/src/features/receipts/utils/receiptQuantities";
import { formatLocalDate } from "@/src/utils/formatDate";
import { formatSku, hasLineCode } from "@/src/utils/sku";
import { EMPTY_VALUE, textOrDash } from "@/src/utils/textOrDash";
import {
  DocumentPdfLayout,
  PdfCardRow,
  PdfCellCaption,
  PdfCellText,
  PdfInfoCard,
  PdfLineItemsTable,
  PdfNotes,
  PdfTotals,
  type PdfColumn,
} from "./shared/DocumentPdfLayout";
import type { PdfCompany } from "./shared/documentPdfModel";

type ReceiptPdfDocumentProps = {
  receipt: ReceiptDetail;
  company: PdfCompany | null;
};

const idOrDash = (value: number | null | undefined): string =>
  value == null ? EMPTY_VALUE : String(value);

/** Identificador del renglón, con la regla de `SkuCode`: SKU, o el código del producto. */
const lineCode = (linea: ReceiptDetailLine): string => {
  const sku = linea.producto_variante_sku?.trim();
  if (sku) return formatSku(sku);
  const codigo = linea.producto_codigo?.trim();
  return codigo ? `Cód. ${codigo}` : EMPTY_VALUE;
};

export const ReceiptPdfDocument = ({ receipt, company }: ReceiptPdfDocumentProps) => {
  const detalles = receipt.detalles ?? [];
  const origin = receiptOrigin(receipt);
  const originText = `${origin.label} ${origin.folio ?? EMPTY_VALUE}`;
  const totalRecibido = totalCantidadRecibida(detalles);

  const columns: PdfColumn<ReceiptDetailLine>[] = [
    ...(hasLineCode(detalles)
      ? [
          {
            id: "sku",
            header: "SKU",
            flex: 2,
            cell: (linea: ReceiptDetailLine) => {
              const proscai = linea.producto_cod_proscai?.trim();
              return (
                <View>
                  <PdfCellText>{lineCode(linea)}</PdfCellText>
                  {proscai ? <PdfCellCaption>{`Proscai ${proscai}`}</PdfCellCaption> : null}
                </View>
              );
            },
          },
        ]
      : []),
    {
      id: "producto",
      header: "Producto",
      flex: 4,
      bold: true,
      cell: (linea) => textOrDash(linea.producto_nombre),
    },
    ...(detalles.some((linea) => linea.producto_variante_talla?.trim())
      ? [
          {
            id: "talla",
            header: "Talla",
            flex: 1,
            cell: (linea: ReceiptDetailLine) => textOrDash(linea.producto_variante_talla),
          },
        ]
      : []),
    ...(detalles.some((linea) => linea.lote != null)
      ? [{ id: "lote", header: "Lote", flex: 1, cell: (linea: ReceiptDetailLine) => idOrDash(linea.lote) }]
      : []),
    ...(detalles.some((linea) => linea.serie != null)
      ? [{ id: "serie", header: "Serie", flex: 1, cell: (linea: ReceiptDetailLine) => idOrDash(linea.serie) }]
      : []),
    {
      id: "cantidad",
      header: "Recibido",
      flex: 1.3,
      align: "right",
      bold: true,
      cell: (linea) => formatCantidadRecibida(linea.cantidad_recibida),
    },
  ];

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={receiptPdfDescriptor(receipt)}
      title="Recepción"
      subtitle={originText}
      date={{ label: "Fecha de recepción", value: formatLocalDate(receipt.fecha_recepcion) }}
      footerDetail={originText}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DE LA RECEPCIÓN"
          items={[
            { label: "Estatus", value: textOrDash(receipt.estatus_label) },
            { label: "Origen", value: origin.label },
            { label: "Folio de origen", value: origin.folio ?? EMPTY_VALUE },
            { label: "Remisión", value: textOrDash(receipt.remision) },
            { label: "Factura de referencia", value: textOrDash(receipt.factura_referencia) },
          ]}
        />
        <PdfInfoCard
          title="PROVEEDOR Y ENTREGA"
          items={[
            { label: "Proveedor", value: textOrDash(receipt.proveedor_nombre) },
            { label: "Almacén", value: textOrDash(receipt.almacen_nombre) },
            { label: "Sucursal", value: textOrDash(receipt.sucursal_nombre) },
          ]}
        />
      </PdfCardRow>

      <PdfLineItemsTable
        title="PRODUCTOS RECIBIDOS"
        rows={detalles}
        columns={columns}
        emptyMessage="Esta recepción no tiene líneas de detalle."
      />

      <PdfTotals
        rows={[
          { label: "Productos", value: detalles.length.toLocaleString("es-MX") },
          { label: "Piezas recibidas", value: formatCantidadRecibida(String(totalRecibido)), emphasis: true },
        ]}
      />

      <PdfNotes text={receipt.observaciones} />
    </DocumentPdfLayout>
  );
};
