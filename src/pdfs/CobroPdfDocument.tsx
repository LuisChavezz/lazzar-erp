/**
 * Documento PDF de un cobro, sobre la plantilla base `DocumentPdfLayout`
 * (EC-859).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que trae `GET /finanzas/cobros/{id}/` (EC-904), tal cual:
 *
 * - Datos del cobro: cliente, estatus, método de pago, referencia, cuenta
 *   bancaria, moneda (la de la cuenta) y —fuera de MXN— tipo de cambio.
 * - Complemento de pago, si se timbró: su folio fiscal, fecha y estado (vigente
 *   o con la cancelación solicitada ante el SAT); el UUID cancelado; o que el
 *   timbrado está pendiente de confirmar. El REP oficial se baja aparte; este
 *   PDF no lo sustituye.
 * - Facturas cobradas: folio de la factura (EC-904) e importe aplicado. SIN
 *   saldo: el de la CxC es el actual, no el del momento del cobro.
 * - Total cobrado y observaciones.
 *
 * Un `Cancelado` lleva la marca "CANCELADO" (`cobroPdfDescriptor`). Nada se
 * recalcula.
 */
import { COBRO_REFERENCIA_LABELS } from "@/src/features/collections/constants/collectionStatus";
import type { Cobro, CobroDetalle } from "@/src/features/collections/interfaces/collection.interface";
import { cobroPdfDescriptor } from "@/src/features/collections/utils/cobroPdf";
import { resolveCobroMoneda } from "@/src/features/collections/utils/collection.utils";
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
import { CFDI_STATE_LABELS, pdfCfdiState, pdfCurrencyItems, pdfDate, pdfDateTime, pdfMoney } from "./shared/financeDocumentPdf";

type CobroPdfDocumentProps = {
  cobro: Cobro;
  company: PdfCompany | null;
};

export const CobroPdfDocument = ({ cobro, company }: CobroPdfDocumentProps) => {
  const lineas = cobro.cobro_detalles ?? [];
  const moneda = resolveCobroMoneda(cobro);
  const money = pdfMoney(moneda);
  const cliente = cobro.cliente_nombre?.trim() || EMPTY_VALUE;

  const columns: PdfColumn<CobroDetalle>[] = [
    {
      id: "factura",
      header: "Factura",
      flex: 3,
      cell: (line) => <PdfCellText bold>{line.factura_folio?.trim() || `CxC #${line.cxc}`}</PdfCellText>,
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

  // Mismos estados que el CFDI de la factura: vigente o con la cancelación
  // solicitada, cancelado (el backend mueve el UUID a `rep_cancelado_uuid`) o
  // timbrado sin confirmar (`rep_pendiente`, aún sin UUID).
  const rep = cobro.rep_uuid
    ? [
        { label: "Folio fiscal", value: cobro.rep_uuid },
        { label: "Timbrado", value: pdfDateTime(cobro.rep_fecha_timbrado) },
        {
          label: "Estado del REP",
          value: pdfCfdiState({ cancelado: false, cancelacionSolicitada: cobro.rep_cancelacion_solicitada }),
        },
      ]
    : cobro.rep_cancelado_uuid
      ? [
          { label: "Folio fiscal (cancelado)", value: cobro.rep_cancelado_uuid },
          { label: "Cancelado", value: pdfDateTime(cobro.rep_fecha_cancelacion) },
          { label: "Estado del REP", value: CFDI_STATE_LABELS.cancelado },
        ]
      : cobro.rep_pendiente
        ? [{ label: "Estado del REP", value: CFDI_STATE_LABELS.pendiente }]
        : null;

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={cobroPdfDescriptor(cobro)}
      title="Cobro"
      subtitle={cliente}
      date={{ label: "Cobro", value: pdfDate(cobro.fecha_cobro) }}
      footerDetail={cliente}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DEL COBRO"
          items={[
            { label: "Cliente", value: cliente },
            { label: "Estatus", value: cobro.estatus },
            { label: "Sucursal", value: textOrDash(cobro.sucursal_nombre) },
            { label: "Método de pago", value: textOrDash(cobro.metodo_pago) },
            { label: "Referencia", value: COBRO_REFERENCIA_LABELS[cobro.referencia] ?? textOrDash(cobro.referencia) },
            ...optionalInfoItem("Ref. de operación", cobro.referencia_operacion),
          ]}
        />
        <PdfInfoCard
          title="CUENTA"
          items={[
            { label: "Cuenta bancaria", value: textOrDash(cobro.cuenta_bancaria_alias) },
            ...pdfCurrencyItems(moneda, cobro.tipo_cambio),
          ]}
        />
      </PdfCardRow>

      {rep ? (
        <PdfCardRow>
          <PdfInfoCard title="COMPLEMENTO DE PAGO (REP)" items={rep} />
        </PdfCardRow>
      ) : null}

      <PdfLineItemsTable
        title="FACTURAS COBRADAS"
        rows={lineas}
        columns={columns}
        emptyMessage="Este cobro no tiene facturas aplicadas."
      />

      <PdfTotals rows={[{ label: "TOTAL COBRADO", value: money(cobro.total_cobrado), emphasis: true }]} />

      <PdfNotes text={cobro.observaciones} />
    </DocumentPdfLayout>
  );
};
