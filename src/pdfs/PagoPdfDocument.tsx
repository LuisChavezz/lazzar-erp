/**
 * Documento PDF de un pago a proveedor, sobre la plantilla base
 * `DocumentPdfLayout` (EC-859).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que trae `GET /finanzas/pagos/{id}/` (EC-904), tal cual:
 *
 * - Datos del pago: proveedor, estatus, método de pago, referencias, cuenta
 *   bancaria y moneda (la de la cuenta). SIN tipo de cambio: el lado de
 *   proveedores no lo registra, y los helpers de tipo de cambio de la factura
 *   lo darían por faltante.
 * - Facturas pagadas: folio de la factura de proveedor (EC-904) e importe
 *   aplicado, sin saldo.
 * - Total pagado y observaciones.
 *
 * El pago no tiene folio: el PDF muestra `#id` y el archivo es `PAG-ID<id>`.
 * Un `Cancelado` lleva la marca "CANCELADO". Nada se recalcula.
 */
import type { Pago, PagoDetalle } from "@/src/features/payments/interfaces/payment.interface";
import { pagoPdfDescriptor } from "@/src/features/payments/utils/pagoPdf";
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
import { conditionalColumn, optionalInfoItem } from "./shared/documentPdfColumns";
import type { PdfCompany } from "./shared/documentPdfModel";
import { pdfDate, pdfMoney } from "./shared/financeDocumentPdf";

type PagoPdfDocumentProps = {
  pago: Pago;
  company: PdfCompany | null;
};

export const PagoPdfDocument = ({ pago, company }: PagoPdfDocumentProps) => {
  const lineas = pago.pago_detalles ?? [];
  const money = pdfMoney(pago.moneda_nombre);
  const proveedor = pago.proveedor_nombre?.trim() || EMPTY_VALUE;

  const columns: PdfColumn<PagoDetalle>[] = [
    {
      id: "factura",
      header: "Factura de proveedor",
      flex: 3,
      cell: (line) => <PdfCellText bold>{line.factura_proveedor_folio?.trim() || `CxP #${line.cxp}`}</PdfCellText>,
    },
    ...conditionalColumn(lineas, (line) => line.observaciones, {
      id: "observaciones",
      header: "Observaciones",
      flex: 4,
      cell: (line) => textOrDash(line.observaciones),
    }),
    {
      id: "importe",
      header: "Importe aplicado",
      flex: 2,
      align: "right",
      bold: true,
      cell: (line) => money(line.importe_aplicado),
    },
  ];

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={pagoPdfDescriptor(pago)}
      title="Pago a proveedor"
      subtitle={proveedor}
      date={{ label: "Pago", value: pdfDate(pago.fecha_pago) }}
      footerDetail={proveedor}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DEL PAGO"
          items={[
            { label: "Proveedor", value: proveedor },
            { label: "Estatus", value: pago.estatus },
            { label: "Sucursal", value: textOrDash(pago.sucursal_nombre) },
            { label: "Método de pago", value: textOrDash(pago.metodo_pago) },
            ...optionalInfoItem("Referencia", pago.referencia),
            ...optionalInfoItem("Ref. de operación", pago.referencia_operacion),
          ]}
        />
        <PdfInfoCard
          title="CUENTA"
          items={[
            { label: "Cuenta bancaria", value: textOrDash(pago.cuenta_bancaria_alias) },
            { label: "Moneda", value: textOrDash(pago.moneda_nombre) },
          ]}
        />
      </PdfCardRow>

      <PdfLineItemsTable
        title="FACTURAS PAGADAS"
        rows={lineas}
        columns={columns}
        emptyMessage="Este pago no tiene facturas aplicadas."
      />

      <PdfTotals rows={[{ label: "TOTAL PAGADO", value: money(pago.total_pagado), emphasis: true }]} />

      <PdfNotes text={pago.observaciones} />
    </DocumentPdfLayout>
  );
};
