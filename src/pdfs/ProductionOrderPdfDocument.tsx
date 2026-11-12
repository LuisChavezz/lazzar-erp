/**
 * Documento PDF de una orden de producción (OP), sobre la plantilla base
 * `DocumentPdfLayout` (EC-855/EC-857): el marco (empresa activa, folio, fecha,
 * marca de cancelado, pie paginado) es el de todos los documentos; aquí solo va
 * el cuerpo.
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo que muestra la página de detalle (`ProductionOrderPageContent`), leído de
 * `onboarding/?op_id=`:
 *
 * - Datos de la orden (estatus, prioridad, alta, fin, cierre solicitado,
 *   activa) y su seguimiento (operador, empresa, sucursal), más las fechas del
 *   pedido y la entrega estimada (EC-880), que la página no muestra.
 * - Los pedidos que cubre, CADA UNO con su cliente: una OP puede cubrir pedidos
 *   de clientes distintos. Las columnas del cliente se omiten si la respuesta
 *   no trae `cliente`.
 * - Por producto: cantidades por talla y color, y habilitación sin desperdicio
 *   (lo que muestra la página) y con desperdicio (`habilitacion_con_desperdicio`,
 *   columna que se omite si la respuesta no la trae).
 * - Consumos por material tal como los resuelve el backend (`consumos_resumen`):
 *   planeado, ajustes y actual con su unidad. No se recalcula nada.
 * - Observaciones.
 *
 * No va `costo_maquila_unitario`: la página no lo muestra. Sin importes ni
 * moneda: no hay nada que ocultar por rol.
 */
import type { PedidoVinculadoCliente } from "@/src/features/orders/interfaces/pedido-vinculado.interface";
import {
  formatBackendQuantity,
  formatSignedBackendQuantity,
} from "@/src/features/production-order-consumption/utils/formatConsumptionQuantity";
import { consumptionProductName } from "@/src/features/production-order-consumption/utils/consumptionRecords";
import {
  PRODUCTION_ORDER_PRIORITY_CONFIG,
  productionOrderPriorityFallback,
  productionOrderStatusEntry,
} from "@/src/features/production-orders/constants/productionOrderStatus";
import type {
  ProductionOrderConsumoResumen,
  ProductionOrderOnboarding,
  ProductionOrderOnboardingTalla,
} from "@/src/features/production-orders/interfaces/production-order.interface";
import {
  productionOrderPdfDescriptor,
  productionOrderPdfHabilitacion,
  productionOrderPdfPedidos,
  type ProductionOrderPdfHabilitacionRow,
  type ProductionOrderPdfPedido,
} from "@/src/features/production-orders/utils/productionOrderPdf";
import { pedidoRefLabel } from "@/src/features/production-orders/utils/opPedidos";
import { formatExactQuantityValue, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate, formatShortDate } from "@/src/utils/formatDate";
import { pluralForQuantity } from "@/src/utils/plural";
import { textOrDash } from "@/src/utils/textOrDash";
import {
  DocumentPdfLayout,
  PdfCardRow,
  PdfInfoCard,
  PdfLineItemsTable,
  PdfNotes,
  PdfTotals,
  type PdfColumn,
  type PdfInfoItem,
} from "./shared/DocumentPdfLayout";
import type { PdfCompany } from "./shared/documentPdfModel";
import { pedidoClienteLabel } from "./shared/pedidoClientePdf";

type ProductionOrderPdfDocumentProps = {
  op: ProductionOrderOnboarding;
  company: PdfCompany | null;
};

const yesNo = (value: boolean) => (value ? "Sí" : "No");

/** Fecha-calendario de EC-880; el renglón se omite si la respuesta no trae la clave. */
const calendarDateItem = (
  label: string,
  value: string | null | undefined,
): PdfInfoItem[] => (value === undefined ? [] : [{ label, value: formatShortCalendarDate(value) }]);

const clienteOf = (pedido: ProductionOrderPdfPedido): PedidoVinculadoCliente | null =>
  pedido.cliente ?? null;

const PEDIDO_COLUMNS: PdfColumn<ProductionOrderPdfPedido>[] = [
  { id: "folio", header: "Pedido", flex: 1.6, bold: true, cell: (pedido) => pedidoRefLabel(pedido) },
  { id: "cliente", header: "Cliente", field: "cliente", flex: 2.4, cell: (p) => textOrDash(clienteOf(p)?.nombre) },
  {
    id: "razon_social",
    header: "Razón social",
    field: "cliente",
    flex: 3,
    cell: (p) => textOrDash(clienteOf(p)?.razon_social),
  },
  { id: "rfc", header: "RFC", field: "cliente", flex: 1.6, cell: (p) => textOrDash(clienteOf(p)?.rfc) },
];

const TALLA_COLUMNS: PdfColumn<ProductionOrderOnboardingTalla>[] = [
  { id: "talla", header: "Talla", flex: 1, cell: (row) => textOrDash(row.talla) },
  { id: "color", header: "Color", flex: 2, cell: (row) => textOrDash(row.color) },
  {
    id: "cantidad",
    header: "Cantidad",
    flex: 1,
    align: "right",
    bold: true,
    cell: (row) => formatQuantityValue(row.cantidad),
  },
];

const HABILITACION_COLUMNS: PdfColumn<ProductionOrderPdfHabilitacionRow>[] = [
  { id: "codigo", header: "Código", flex: 1.6, cell: (row) => textOrDash(row.codigo) },
  { id: "descripcion", header: "Descripción", flex: 3.4, cell: (row) => textOrDash(row.descripcion) },
  { id: "unidad", header: "Unidad", flex: 0.9, cell: (row) => textOrDash(row.unidad) },
  {
    id: "total",
    header: "Total",
    flex: 1.2,
    align: "right",
    cell: (row) => formatExactQuantityValue(row.total),
  },
  {
    id: "total_con_desperdicio",
    header: "Con desperdicio",
    field: "total_con_desperdicio",
    flex: 1.4,
    align: "right",
    bold: true,
    cell: (row) => formatBackendQuantity(row.total_con_desperdicio ?? null),
  },
];

const CONSUMO_COLUMNS: PdfColumn<ProductionOrderConsumoResumen>[] = [
  { id: "producto", header: "Material", flex: 3.4, cell: (row) => consumptionProductName(row) },
  { id: "unidad", header: "Unidad", flex: 0.9, cell: (row) => textOrDash(row.unidad) },
  { id: "planeado", header: "Planeado", flex: 1.3, align: "right", cell: (row) => formatBackendQuantity(row.planeado) },
  {
    id: "ajustes",
    header: "Ajustes",
    flex: 1.3,
    align: "right",
    cell: (row) => formatSignedBackendQuantity(row.ajustes),
  },
  {
    id: "actual",
    header: "Actual",
    flex: 1.3,
    align: "right",
    bold: true,
    cell: (row) => formatBackendQuantity(row.actual),
  },
];

export const ProductionOrderPdfDocument = ({ op, company }: ProductionOrderPdfDocumentProps) => {
  const pedidos = productionOrderPdfPedidos(op);
  // Clientes distintos de los pedidos, en su orden: una OP con dos pedidos del
  // mismo cliente lo dice una vez.
  const clientes = [...new Set(pedidos.map((pedido) => pedidoClienteLabel(pedido.cliente)).filter(Boolean))];
  const clientesText = clientes.length > 0 ? clientes.join(" · ") : null;
  const productos = op.productos ?? [];
  // La misma suma que el chip "N piezas" de la página.
  const totalPiezas = productos.reduce((sum, producto) => sum + (Number(producto.cantidades.total) || 0), 0);
  const prioridad =
    PRODUCTION_ORDER_PRIORITY_CONFIG[String(op.prioridad)]?.label ??
    productionOrderPriorityFallback(op.prioridad).label;

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={productionOrderPdfDescriptor(op)}
      title="Orden de producción"
      subtitle={clientesText}
      date={{ label: "Alta", value: formatShortDate(op.fecha_inicio) }}
      footerDetail={clientesText}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DE LA ORDEN"
          items={[
            { label: "Estatus", value: productionOrderStatusEntry(op.estatus_op, op.estatus_op_display).label },
            { label: "Prioridad", value: textOrDash(prioridad) },
            { label: "Alta", value: formatShortDate(op.fecha_inicio) },
            { label: "Fin", value: formatShortDate(op.fecha_fin) },
            { label: "Cierre solicitado", value: yesNo(op.cerrar_orden) },
            { label: "Activa", value: yesNo(op.activo) },
          ]}
        />
        <PdfInfoCard
          title="ORIGEN Y SEGUIMIENTO"
          items={[
            { label: "Operador asignado", value: textOrDash(op.usuario_nombre) },
            { label: "Empresa", value: textOrDash(op.empresa_nombre) },
            { label: "Sucursal", value: textOrDash(op.sucursal_nombre) },
            ...calendarDateItem("Fecha del pedido", op.fecha_pedido),
            ...calendarDateItem("Vence", op.fecha_vence),
            ...calendarDateItem("Entrega estimada", op.fecha_entrega_estimada),
          ]}
        />
      </PdfCardRow>

      <PdfLineItemsTable
        title={pedidos.length > 1 ? "PEDIDOS" : "PEDIDO"}
        rows={pedidos}
        columns={PEDIDO_COLUMNS}
        emptyMessage="Esta orden no está ligada a un pedido."
      />

      {productos.length === 0 ? (
        <PdfLineItemsTable
          title="PRODUCTOS"
          rows={[]}
          columns={TALLA_COLUMNS}
          emptyMessage="Esta orden no tiene productos registrados."
        />
      ) : (
        productos.flatMap(productoTables)
      )}

      <PdfTotals
        rows={[
          { label: "Productos", value: productos.length.toLocaleString("es-MX") },
          { label: "Piezas", value: formatQuantityValue(totalPiezas), emphasis: true },
        ]}
      />

      {op.consumos_resumen === undefined ? null : (
        <PdfLineItemsTable
          title="CONSUMOS"
          rows={op.consumos_resumen}
          columns={CONSUMO_COLUMNS}
          emptyMessage="Esta orden no tiene consumos de material registrados."
        />
      )}

      <PdfNotes text={op.observaciones} />
    </DocumentPdfLayout>
  );
};

/**
 * Las dos tablas de un producto: cantidades por talla y habilitación. Función
 * y no componente: el árbol queda plano (las pruebas lo recorren sin renderizar).
 */
function productoTables(producto: ProductionOrderOnboarding["productos"][number], index: number) {
  const nombre = textOrDash(producto.nombre);
  return [
    <PdfLineItemsTable
      key={`tallas-${index}`}
      title={`${nombre} · POR TALLA · ${formatQuantityValue(producto.cantidades.total)} ${pluralForQuantity(producto.cantidades.total, "PIEZA", "PIEZAS")}`}
      rows={producto.cantidades.tallas}
      columns={TALLA_COLUMNS}
      emptyMessage="Sin desglose por talla."
    />,
    <PdfLineItemsTable
      key={`habilitacion-${index}`}
      title={`${nombre} · HABILITACIÓN`}
      rows={productionOrderPdfHabilitacion(producto)}
      columns={HABILITACION_COLUMNS}
      emptyMessage="Este producto no tiene materiales registrados."
    />,
  ];
}
