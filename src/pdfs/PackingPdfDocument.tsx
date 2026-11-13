/**
 * Documento PDF de un embarque (packing), sobre la plantilla base
 * `DocumentPdfLayout` (EC-855/EC-858).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que trae `GET /wms/packings/{id}/` (EC-882), tal cual:
 *
 * - Datos del embarque: estatus, cajas, peso y volumen totales, inicio, fin,
 *   operador y quién lo registró.
 * - Surtido de origen (folio, estatus y almacén del picking) y pedido.
 * - El cliente del pedido (`pedido_vinculado.cliente`, forma de EC-880); la
 *   tarjeta se omite si la respuesta no trae la clave.
 * - Renglones con SKU, producto, color y talla del backend (líneas de muestra
 *   incluidas), ubicación y caja solo si algún renglón las trae, cantidades
 *   solicitada, asignada, surtida y empacada, y estatus.
 * - Observaciones.
 *
 * Sin importes (el documento no tiene) y sin totales: nada se suma en el cliente.
 */
import { PACKING_STATUS_CONFIG } from "@/src/features/packing/constants/packingStatus";
import type { Packing, PackingDetalleLine } from "@/src/features/packing/interfaces/packing.interface";
import { packingPdfDescriptor } from "@/src/features/packing/utils/packingPdf";
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
import { pedidoClienteItems, pedidoClienteLabel } from "./shared/pedidoClientePdf";
import { conditionalColumn, wmsProductColumns } from "./shared/wmsDocumentPdf";

type PackingPdfDocumentProps = {
  packing: Packing;
  company: PdfCompany | null;
};

const quantity = (id: string, header: string, value: (line: PackingDetalleLine) => string): PdfColumn<PackingDetalleLine> => ({
  id,
  header,
  flex: 1,
  align: "right",
  cell: (line) => formatExactQuantityValue(value(line)),
});

export const PackingPdfDocument = ({ packing, company }: PackingPdfDocumentProps) => {
  const lineas = packing.packing_detalle ?? [];
  const cliente = packing.pedido_vinculado?.cliente;
  const clienteText = pedidoClienteLabel(cliente);

  const columns: PdfColumn<PackingDetalleLine>[] = [
    ...wmsProductColumns<PackingDetalleLine>(),
    ...conditionalColumn(lineas, (line) => line.ubicacion_nombre, {
      id: "ubicacion",
      header: "Ubicación",
      flex: 1.6,
      cell: (line) => textOrDash(line.ubicacion_nombre),
    }),
    ...conditionalColumn(lineas, (line) => line.caja_numero, {
      id: "caja",
      header: "Caja",
      flex: 0.7,
      align: "right",
      cell: (line) => (line.caja_numero == null ? textOrDash(null) : String(line.caja_numero)),
    }),
    quantity("solicitada", "Solicitada", (line) => line.cantidad_solicitada),
    quantity("asignada", "Asignada", (line) => line.cantidad_asignada),
    quantity("surtida", "Surtida", (line) => line.cantidad_surtida),
    { ...quantity("empacada", "Empacada", (line) => line.cantidad_empacada), bold: true },
    {
      id: "estatus",
      header: "Estatus",
      flex: 1.1,
      cell: (line) => PACKING_STATUS_CONFIG[line.estado]?.label ?? textOrDash(line.estado),
    },
  ];

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={packingPdfDescriptor(packing)}
      title="Embarque"
      subtitle={clienteText}
      date={{ label: "Alta", value: formatShortDate(packing.created_at) }}
      footerDetail={clienteText}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DEL EMBARQUE"
          items={[
            { label: "Estatus", value: PACKING_STATUS_CONFIG[packing.estado]?.label ?? textOrDash(packing.estado) },
            { label: "Cajas", value: String(packing.numero_cajas) },
            { label: "Peso total", value: `${formatExactQuantityValue(packing.peso_total)} kg` },
            { label: "Volumen total", value: `${formatExactQuantityValue(packing.volumen_total)} m³` },
            { label: "Inicio", value: formatShortDateTime(packing.fecha_inicio) },
            { label: "Fin", value: formatShortDateTime(packing.fecha_fin) },
          ]}
        />
        <PdfInfoCard
          title="SURTIDO DE ORIGEN"
          items={[
            { label: "Surtido", value: textOrDash(packing.picking_folio) },
            { label: "Estatus del surtido", value: textOrDash(packing.picking_estado) },
            { label: "Almacén", value: textOrDash(packing.picking_almacen_nombre) },
            { label: "Pedido", value: textOrDash(packing.pedido_vinculado?.folio ?? packing.pedido_folio) },
            { label: "Operador", value: textOrDash(packing.operador_nombre) },
            { label: "Registró", value: textOrDash(packing.usuario_nombre) },
          ]}
        />
      </PdfCardRow>

      {cliente === undefined ? null : (
        <PdfCardRow>
          <PdfInfoCard title="CLIENTE" items={pedidoClienteItems(cliente)} />
        </PdfCardRow>
      )}

      <PdfLineItemsTable
        title="LÍNEAS DEL EMBARQUE"
        rows={lineas}
        columns={columns}
        emptyMessage="Este embarque no tiene líneas registradas."
      />

      <PdfNotes text={packing.observaciones} />
    </DocumentPdfLayout>
  );
};
