/**
 * Documento PDF de un traspaso entre almacenes, sobre la plantilla base
 * `DocumentPdfLayout` (EC-855/EC-858).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que trae `GET /wms/transferencias/{id}/` (EC-882), tal cual:
 *
 * - Datos del traspaso: estatus, fecha y quién lo registró; almacén de origen
 *   y de destino.
 * - Renglones con SKU, producto, color y talla del backend (la línea de muestra
 *   de un surtido incluida), cantidad y, solo si algún renglón las trae, las
 *   ubicaciones de origen y destino.
 * - Observaciones (el traspaso que crea un surtido dice ahí de cuál viene).
 *
 * Un traspaso `CANCELADA` o `FALLIDA` lleva la marca con esa leyenda
 * (`stockTransferPdfDescriptor`). Sin importes ni totales; lote y serie no
 * salen: llegan solo como id.
 */
import { TRANSFER_STATUS_CONFIG } from "@/src/features/stock-transfers/constants/transferStatus";
import type {
  TransferenciaDetail,
  TransferenciaDetalleLine,
} from "@/src/features/stock-transfers/interfaces/stock-transfer.interface";
import { stockTransferPdfDescriptor } from "@/src/features/stock-transfers/utils/stockTransferPdf";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate, formatShortDateTime } from "@/src/utils/formatDate";
import { textOrDash } from "@/src/utils/textOrDash";
import {
  DocumentPdfLayout,
  PdfCardRow,
  PdfInfoCard,
  PdfLineItemsTable,
  PdfNotes,
  type PdfColumn,
} from "./shared/DocumentPdfLayout";
import type { PdfCompany } from "./shared/documentPdfModel";
import { conditionalColumn, wmsProductColumns } from "./shared/wmsDocumentPdf";

type StockTransferPdfDocumentProps = {
  transfer: TransferenciaDetail;
  company: PdfCompany | null;
};

export const StockTransferPdfDocument = ({ transfer, company }: StockTransferPdfDocumentProps) => {
  const lineas = transfer.transferencia_detalle ?? [];
  // Sin flecha: la Helvetica estándar del PDF (WinAnsi) no tiene "→" y la omite.
  const ruta = `De ${textOrDash(transfer.almacen_origen_nombre)} a ${textOrDash(transfer.almacen_destino_nombre)}`;

  const columns: PdfColumn<TransferenciaDetalleLine>[] = [
    ...wmsProductColumns<TransferenciaDetalleLine>(),
    {
      id: "cantidad",
      header: "Cantidad",
      flex: 1,
      align: "right",
      bold: true,
      cell: (line) => formatExactQuantityValue(line.cantidad),
    },
    ...conditionalColumn(lineas, (line) => line.ubicacion_origen_nombre, {
      id: "ubicacion_origen",
      header: "Ubicación origen",
      flex: 1.8,
      cell: (line) => textOrDash(line.ubicacion_origen_nombre),
    }),
    ...conditionalColumn(lineas, (line) => line.ubicacion_destino_nombre, {
      id: "ubicacion_destino",
      header: "Ubicación destino",
      flex: 1.8,
      cell: (line) => textOrDash(line.ubicacion_destino_nombre),
    }),
  ];

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={stockTransferPdfDescriptor(transfer)}
      title="Traspaso entre almacenes"
      subtitle={ruta}
      date={{ label: "Fecha", value: formatShortDate(transfer.fecha_creacion) }}
      footerDetail={ruta}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DEL TRASPASO"
          items={[
            {
              label: "Estatus",
              value: (transfer.status && TRANSFER_STATUS_CONFIG[transfer.status]?.label) || textOrDash(transfer.status),
            },
            { label: "Fecha", value: formatShortDateTime(transfer.fecha_creacion) },
            { label: "Registró", value: textOrDash(transfer.usuario_nombre) },
          ]}
        />
        <PdfInfoCard
          title="ALMACENES"
          items={[
            { label: "Origen", value: textOrDash(transfer.almacen_origen_nombre) },
            { label: "Destino", value: textOrDash(transfer.almacen_destino_nombre) },
          ]}
        />
      </PdfCardRow>

      <PdfLineItemsTable
        title="LÍNEAS DEL TRASPASO"
        rows={lineas}
        columns={columns}
        emptyMessage="Este traspaso no tiene líneas registradas."
      />

      <PdfNotes text={transfer.observaciones} />
    </DocumentPdfLayout>
  );
};
