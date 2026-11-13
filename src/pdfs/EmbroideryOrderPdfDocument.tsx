/**
 * Documento PDF de una orden de bordado (OB), sobre la plantilla base
 * `DocumentPdfLayout` (EC-855/EC-857).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que muestra la página de detalle (`EmbroideryOrderDetailContent`), leído
 * del retrieve `GET /produccion/orden-bordado/{id}/`:
 *
 * - Datos de la orden (estatus, alta, fin, máquina asignada) y su seguimiento
 *   (pedido, operador, proveedor —"Bordado interno" sin proveedor—, empresa,
 *   sucursal).
 * - El cliente del pedido (`pedido_vinculado.cliente`, EC-880). La tarjeta se
 *   omite si la respuesta no trae la clave.
 * - Cobertura del pedido y las otras órdenes del mismo pedido.
 * - Prendas agrupadas por prenda + color como en la pantalla, con el bordado
 *   de cada talla como TEXTO (ubicación, medidas, hilo, pantones, técnicas):
 *   sin imágenes.
 * - Observaciones.
 */
import { View } from "@react-pdf/renderer";
import { embroideryStatusEntry } from "@/src/features/embroidery/constants/embroideryStatus";
import type { EmbroideryOrderDetail, EmbroideryOrderDetailLine } from "@/src/features/embroidery/interfaces/embroidery.interface";
import {
  embroideryLineBordadoText,
  embroideryOrderPdfDescriptor,
} from "@/src/features/embroidery/utils/embroideryOrderPdf";
import { formatShortDate } from "@/src/utils/formatDate";
import { EMPTY_VALUE, textOrDash } from "@/src/utils/textOrDash";
import {
  DocumentPdfLayout,
  PdfCardRow,
  PdfCellCaption,
  PdfCellText,
  PdfInfoCard,
  PdfNotes,
} from "./shared/DocumentPdfLayout";
import type { PdfCompany } from "./shared/documentPdfModel";
import { pedidoClienteItems, pedidoClienteLabel } from "./shared/pedidoClientePdf";
import { workOrderCoverageItems, workOrderGarmentTables, type WorkOrderPdfGarmentRow } from "./shared/workOrderPdf";

type EmbroideryOrderPdfDocumentProps = {
  order: EmbroideryOrderDetail;
  company: PdfCompany | null;
};

/** Celda "Bordado": un bloque por ubicación, la primera línea en negritas. */
const bordadoCell = ({ item }: WorkOrderPdfGarmentRow<EmbroideryOrderDetailLine>) => {
  const bloques = embroideryLineBordadoText(item);
  if (bloques.length === 0) return EMPTY_VALUE;
  return (
    <View>
      {bloques.map((lineas, index) => (
        <View key={index}>
          <PdfCellText bold>{lineas[0]}</PdfCellText>
          {lineas.slice(1).map((linea) => (
            <PdfCellCaption key={linea}>{linea}</PdfCellCaption>
          ))}
        </View>
      ))}
    </View>
  );
};

export const EmbroideryOrderPdfDocument = ({ order, company }: EmbroideryOrderPdfDocumentProps) => {
  const cliente = order.pedido_vinculado?.cliente;
  const clienteText = pedidoClienteLabel(cliente);
  const pedidoFolio = order.pedido_vinculado?.folio ?? order.pedido_folio;

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={embroideryOrderPdfDescriptor(order)}
      title="Orden de bordado"
      subtitle={clienteText}
      date={{ label: "Alta", value: formatShortDate(order.fecha_inicio) }}
      footerDetail={clienteText}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DE LA ORDEN"
          items={[
            {
              label: "Estatus",
              value: textOrDash(embroideryStatusEntry(order.estatus_bordado, order.estatus_bordado_display).label),
            },
            { label: "Alta", value: formatShortDate(order.fecha_inicio) },
            { label: "Fin", value: formatShortDate(order.fecha_fin) },
            { label: "Máquina asignada", value: textOrDash(order.maquina_asignada) },
          ]}
        />
        <PdfInfoCard
          title="ORIGEN Y SEGUIMIENTO"
          items={[
            { label: "Pedido", value: textOrDash(pedidoFolio) },
            { label: "Operador asignado", value: textOrDash(order.usuario_nombre) },
            { label: "Proveedor", value: order.proveedor_nombre?.trim() || "Bordado interno" },
            { label: "Empresa", value: textOrDash(order.empresa_nombre) },
            { label: "Sucursal", value: textOrDash(order.sucursal_nombre) },
          ]}
        />
      </PdfCardRow>

      <PdfCardRow>
        {cliente === undefined ? null : <PdfInfoCard title="CLIENTE" items={pedidoClienteItems(cliente)} />}
        <PdfInfoCard
          title="COBERTURA DEL PEDIDO"
          items={workOrderCoverageItems({
            cubierta: order.cantidad_cubierta,
            contratada: order.cantidad_contratada,
            completa: order.cobertura_completa,
            otrasOrdenes: (order.otras_ordenes_del_pedido ?? []).map((otra) => otra.folio_bordado),
            repartoAproximado: order.reparto_por_talla_aproximado,
          })}
        />
      </PdfCardRow>

      {workOrderGarmentTables({
        items: order.detalles ?? [],
        toLine: (linea) => ({
          id: linea.id,
          productoId: linea.producto,
          producto: linea.producto_nombre ?? `Producto #${linea.producto}`,
          color: linea.color_nombre ?? null,
          talla: linea.talla_nombre,
          cantidad: linea.cantidad,
          sku: linea.sku,
          programado: linea.cantidad_asignada,
          pedido: linea.cantidad_pedido,
          pendiente: linea.cantidad_pendiente,
        }),
        extraColumns: [{ id: "bordado", header: "Bordado", flex: 3.2, cell: bordadoCell }],
      })}

      <PdfNotes text={order.observaciones} />
    </DocumentPdfLayout>
  );
};
