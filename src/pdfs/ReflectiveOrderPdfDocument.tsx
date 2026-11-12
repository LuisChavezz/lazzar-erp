/**
 * Documento PDF de una orden de reflejante (OR), sobre la plantilla base
 * `DocumentPdfLayout` (EC-855/EC-857).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que muestra la página de detalle (`ReflectiveOrderDetailContent`), leído
 * del retrieve `GET /produccion/orden-reflejante/{id}/`:
 *
 * - Datos de la orden (estatus, prioridad, alta, fin) y su seguimiento (pedido,
 *   operador, total de piezas, empresa, sucursal), más la fecha del pedido y
 *   el vencimiento; un `fecha_vence` en `null` sale "—".
 * - El cliente del pedido (`pedido_vinculado.cliente`, EC-880). La tarjeta se
 *   omite si la respuesta no trae la clave.
 * - Cobertura del pedido y las otras órdenes del mismo pedido.
 * - Prendas agrupadas por prenda + color como en la pantalla, con la
 *   configuración de reflejante de cada talla como texto, tipo, posición y
 *   metros (un `0` sale "—", como en la pantalla). Un renglón sin color (sin
 *   la clave `color_nombre`) cae en "Sin color".
 * - Observaciones.
 */
import { View } from "@react-pdf/renderer";
import {
  REFLECTIVE_ORDER_PRIORITY_CONFIG,
  reflectiveOrderPriorityFallback,
  reflectiveStatusEntry,
} from "@/src/features/reflective-orders/constants/reflectiveOrderStatus";
import type {
  ReflectiveOrderDetail,
  ReflectiveOrderDetailLine,
} from "@/src/features/reflective-orders/interfaces/reflective-order.interface";
import {
  reflectiveLineConfigText,
  reflectiveMetrosText,
  reflectiveOrderPdfDescriptor,
} from "@/src/features/reflective-orders/utils/reflectiveOrderPdf";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate, formatShortDate } from "@/src/utils/formatDate";
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

type ReflectiveOrderPdfDocumentProps = {
  order: ReflectiveOrderDetail;
  company: PdfCompany | null;
};

type Row = WorkOrderPdfGarmentRow<ReflectiveOrderDetailLine>;

/** Celda "Reflejante": un bloque por entrada, el material en negritas. */
const reflejanteCell = ({ item }: Row) => {
  const bloques = reflectiveLineConfigText(item);
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

export const ReflectiveOrderPdfDocument = ({ order, company }: ReflectiveOrderPdfDocumentProps) => {
  const cliente = order.pedido_vinculado?.cliente;
  const clienteText = pedidoClienteLabel(cliente);
  const prioridad =
    REFLECTIVE_ORDER_PRIORITY_CONFIG[String(order.prioridad)]?.label ??
    reflectiveOrderPriorityFallback(order.prioridad).label;

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={reflectiveOrderPdfDescriptor(order)}
      title="Orden de reflejante"
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
              value: textOrDash(reflectiveStatusEntry(order.estatus_reflejante, order.estatus_reflejante_display).label),
            },
            { label: "Prioridad", value: textOrDash(prioridad) },
            { label: "Alta", value: formatShortDate(order.fecha_inicio) },
            { label: "Fin", value: formatShortDate(order.fecha_fin) },
            { label: "Fecha del pedido", value: formatShortCalendarDate(order.fecha_pedido) },
            { label: "Vence", value: formatShortCalendarDate(order.fecha_vence) },
          ]}
        />
        <PdfInfoCard
          title="ORIGEN Y SEGUIMIENTO"
          items={[
            { label: "Pedido", value: textOrDash(order.pedido_vinculado?.folio ?? order.pedido_folio) },
            { label: "Operador asignado", value: textOrDash(order.usuario_nombre) },
            { label: "Total piezas", value: formatQuantityValue(order.cantidad_cubierta) },
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
            otrasOrdenes: (order.otras_ordenes_del_pedido ?? []).map((otra) => otra.folio_reflejante),
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
        extraColumns: [
          { id: "reflejante", header: "Reflejante", flex: 2.4, cell: reflejanteCell },
          { id: "tipo", header: "Tipo", flex: 1.6, cell: ({ item }: Row) => textOrDash(item.tipo_reflejante) },
          { id: "posicion", header: "Posición", flex: 1.3, cell: ({ item }: Row) => textOrDash(item.posicion) },
          {
            id: "metros",
            header: "Metros",
            flex: 0.9,
            align: "right",
            cell: ({ item }: Row) => reflectiveMetrosText(item.metros),
          },
        ],
      })}

      <PdfNotes text={order.observaciones} />
    </DocumentPdfLayout>
  );
};
