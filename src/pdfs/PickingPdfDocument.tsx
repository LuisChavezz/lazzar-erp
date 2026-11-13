/**
 * Documento PDF de un surtido (picking), sobre la plantilla base
 * `DocumentPdfLayout` (EC-855/EC-858).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que trae `GET /wms/pickings/{id}/` (EC-882), tal cual:
 *
 * - Datos del surtido: estatus, prioridad, tipo, avance (`total_lineas_completas`
 *   de `total_lineas`), fecha límite, inicio, fin, operador y quién lo registró.
 *   La fecha límite va SIN marca de vencido: `esta_vencida` la calcula la
 *   pantalla en el cliente y no entra al PDF.
 * - Pedido, ubicación actual de las prendas (`almacen_actual_nombre`), traspaso
 *   (folio TR) y, solo si vienen, oleada y zona.
 * - El cliente del pedido (`pedido_vinculado.cliente`, EC-882 con la forma de
 *   EC-880); la tarjeta se omite si la respuesta no trae la clave.
 * - Renglones con SKU, producto, color y talla del backend (líneas de muestra
 *   incluidas), ubicación solo si algún renglón la trae, cantidades y estatus.
 * - Observaciones.
 *
 * Sin importes (el documento no tiene) y sin totales: nada se suma en el cliente.
 * Lote no sale: llega solo como id.
 */
import type { Picking, PickingDetalleLine } from "@/src/features/picking/interfaces/picking.interface";
import { PICKING_LINEA_ESTADO_CONFIG } from "@/src/features/picking/constants/pickingLineaEstado";
import { PICKING_PRIORIDAD_CONFIG } from "@/src/features/picking/constants/pickingPrioridad";
import { PICKING_STATUS_CONFIG } from "@/src/features/picking/constants/pickingStatus";
import { PICKING_TIPO_LABELS } from "@/src/features/picking/constants/pickingTipo";
import { pickingPdfDescriptor } from "@/src/features/picking/utils/pickingPdf";
import { formatShortDate, formatShortDateTime } from "@/src/utils/formatDate";
import { plural } from "@/src/utils/plural";
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
import { conditionalColumn, wmsQuantityColumn, optionalInfoItem, wmsProductColumns } from "./shared/wmsDocumentPdf";

type PickingPdfDocumentProps = {
  picking: Picking;
  company: PdfCompany | null;
};

const quantity = (id: string, header: string, value: (line: PickingDetalleLine) => string) =>
  wmsQuantityColumn<PickingDetalleLine>(id, header, value);

export const PickingPdfDocument = ({ picking, company }: PickingPdfDocumentProps) => {
  const lineas = picking.picking_detalle ?? [];
  const cliente = picking.pedido_vinculado?.cliente;
  const clienteText = pedidoClienteLabel(cliente);

  const columns: PdfColumn<PickingDetalleLine>[] = [
    ...wmsProductColumns<PickingDetalleLine>(),
    ...conditionalColumn(lineas, (line) => line.ubicacion_nombre, {
      id: "ubicacion",
      header: "Ubicación",
      flex: 1.6,
      cell: (line) => textOrDash(line.ubicacion_nombre),
    }),
    quantity("solicitada", "Solicitada", (line) => line.cantidad_solicitada),
    quantity("asignada", "Asignada", (line) => line.cantidad_asignada),
    { ...quantity("surtida", "Surtida", (line) => line.cantidad_surtida), bold: true },
    quantity("diferencia", "Diferencia", (line) => line.diferencia),
    {
      id: "estatus",
      header: "Estatus",
      flex: 1.1,
      cell: (line) => PICKING_LINEA_ESTADO_CONFIG[line.estado]?.label ?? textOrDash(line.estado),
    },
  ];

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={pickingPdfDescriptor(picking)}
      title="Surtido"
      subtitle={clienteText}
      date={{ label: "Alta", value: formatShortDate(picking.created_at) }}
      footerDetail={clienteText}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DEL SURTIDO"
          items={[
            { label: "Estatus", value: PICKING_STATUS_CONFIG[picking.estado]?.label ?? textOrDash(picking.estado) },
            {
              label: "Prioridad",
              value: PICKING_PRIORIDAD_CONFIG[picking.prioridad]?.label ?? textOrDash(picking.prioridad),
            },
            { label: "Tipo", value: PICKING_TIPO_LABELS[picking.tipo] ?? textOrDash(picking.tipo) },
            {
              label: "Avance",
              value: `${picking.total_lineas_completas} de ${picking.total_lineas} ${plural(picking.total_lineas, "línea", "líneas")}`,
            },
            { label: "Fecha límite", value: formatShortDate(picking.fecha_limite) },
            { label: "Inicio", value: formatShortDateTime(picking.fecha_inicio) },
            { label: "Fin", value: formatShortDateTime(picking.fecha_fin) },
          ]}
        />
        <PdfInfoCard
          title="PEDIDO Y UBICACIÓN"
          items={[
            { label: "Pedido", value: textOrDash(picking.pedido_vinculado?.folio ?? picking.pedido_folio) },
            { label: "Ubicación actual", value: textOrDash(picking.almacen_actual_nombre) },
            { label: "Traspaso", value: textOrDash(picking.transferencia_folio) },
            ...optionalInfoItem("Oleada", picking.oleada_nombre),
            ...optionalInfoItem("Zona", picking.zona_almacen_nombre),
            { label: "Operador", value: textOrDash(picking.operador_nombre) },
            { label: "Registró", value: textOrDash(picking.usuario_nombre) },
          ]}
        />
      </PdfCardRow>

      {cliente === undefined ? null : (
        <PdfCardRow>
          <PdfInfoCard title="CLIENTE" items={pedidoClienteItems(cliente)} />
        </PdfCardRow>
      )}

      <PdfLineItemsTable
        title="LÍNEAS DEL SURTIDO"
        rows={lineas}
        columns={columns}
        emptyMessage="Este surtido no tiene líneas registradas."
      />

      <PdfNotes text={picking.observaciones} />
    </DocumentPdfLayout>
  );
};
