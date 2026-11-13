/**
 * Documento PDF de una orden de corte de manga (OCM), sobre la plantilla base
 * `DocumentPdfLayout` (EC-855/EC-857).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que muestra la página de detalle (`CorteMangaOrderPageContent`), leído
 * del retrieve `GET /produccion/orden-corte-manga/{id}/`:
 *
 * - Datos de la orden (estatus, prioridad, alta, fin), la fecha del pedido y
 *   "Vence" (`fecha_vence`, que el detalle trae desde EC-880), y su
 *   seguimiento (pedido, operador, total de piezas, empresa, sucursal).
 * - El cliente del pedido (`pedido_vinculado.cliente`, EC-880). La tarjeta se
 *   omite si la respuesta no trae la clave.
 * - Cobertura del pedido y las otras órdenes del mismo pedido, si la respuesta
 *   las trae (igual que la página).
 * - Prendas agrupadas por prenda + color como en la pantalla.
 * - Observaciones.
 */
import {
  CORTE_MANGA_ORDER_PRIORITY_CONFIG,
  corteMangaOrderPriorityFallback,
  corteMangaStatusEntry,
} from "@/src/features/corte-manga/constants/corteMangaOrderStatus";
import type { CorteMangaOrder } from "@/src/features/corte-manga/interfaces/corte-manga-order.interface";
import { corteMangaOrderPdfDescriptor } from "@/src/features/corte-manga/utils/corteMangaOrderPdf";
import { corteMangaTotalPiezas } from "@/src/features/corte-manga/utils/corteMangaPiezas";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate, formatShortDate } from "@/src/utils/formatDate";
import { textOrDash } from "@/src/utils/textOrDash";
import { DocumentPdfLayout, PdfCardRow, PdfInfoCard, PdfNotes } from "./shared/DocumentPdfLayout";
import type { PdfCompany } from "./shared/documentPdfModel";
import { pedidoClienteItems, pedidoClienteLabel } from "./shared/pedidoClientePdf";
import { workOrderCoverageItems, workOrderGarmentTables } from "./shared/workOrderPdf";

type CorteMangaOrderPdfDocumentProps = {
  order: CorteMangaOrder;
  company: PdfCompany | null;
};

export const CorteMangaOrderPdfDocument = ({ order, company }: CorteMangaOrderPdfDocumentProps) => {
  const cliente = order.pedido_vinculado?.cliente;
  const clienteText = pedidoClienteLabel(cliente);
  const prioridad =
    CORTE_MANGA_ORDER_PRIORITY_CONFIG[String(order.prioridad)]?.label ??
    corteMangaOrderPriorityFallback(order.prioridad).label;
  const detalles = order.detalles ?? [];
  const hasCoverage = order.cantidad_contratada !== undefined && order.cantidad_cubierta !== undefined;

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={corteMangaOrderPdfDescriptor(order)}
      title="Orden de corte de manga"
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
              value: textOrDash(corteMangaStatusEntry(order.estatus_corte, order.estatus_corte_display).label),
            },
            { label: "Prioridad", value: textOrDash(prioridad) },
            { label: "Alta", value: formatShortDate(order.fecha_inicio) },
            { label: "Fin", value: formatShortDate(order.fecha_fin) },
            ...(order.fecha_pedido === undefined
              ? []
              : [{ label: "Fecha del pedido", value: formatShortCalendarDate(order.fecha_pedido) }]),
            ...(order.fecha_vence === undefined
              ? []
              : [{ label: "Vence", value: formatShortCalendarDate(order.fecha_vence) }]),
          ]}
        />
        <PdfInfoCard
          title="ORIGEN Y SEGUIMIENTO"
          items={[
            { label: "Pedido", value: textOrDash(order.pedido_vinculado?.folio ?? order.pedido_folio) },
            { label: "Operador asignado", value: textOrDash(order.usuario_nombre) },
            { label: "Total piezas", value: formatQuantityValue(corteMangaTotalPiezas({ ...order, detalles })) },
            { label: "Empresa", value: textOrDash(order.empresa_nombre) },
            { label: "Sucursal", value: textOrDash(order.sucursal_nombre) },
          ]}
        />
      </PdfCardRow>

      {cliente === undefined && !hasCoverage ? null : (
        <PdfCardRow>
          {cliente === undefined ? null : <PdfInfoCard title="CLIENTE" items={pedidoClienteItems(cliente)} />}
          {hasCoverage ? (
            <PdfInfoCard
              title="COBERTURA DEL PEDIDO"
              items={workOrderCoverageItems({
                cubierta: order.cantidad_cubierta ?? 0,
                contratada: order.cantidad_contratada ?? 0,
                completa: Boolean(order.cobertura_completa),
                otrasOrdenes: (order.otras_ordenes_del_pedido ?? []).map((otra) => otra.folio_ocm ?? null),
              })}
            />
          ) : null}
        </PdfCardRow>
      )}

      {workOrderGarmentTables({
        items: detalles,
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
      })}

      <PdfNotes text={order.observaciones} />
    </DocumentPdfLayout>
  );
};
