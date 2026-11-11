/**
 * Documento PDF de una orden de compra, sobre la plantilla base
 * `DocumentPdfLayout` (EC-855): el marco (empresa activa, folio, fecha, marca
 * de cancelado, pie paginado) es el de todos los documentos; aquí solo va el
 * cuerpo de la OC.
 *
 * ─── DECISIÓN DE CONTENIDO (Fase 1.4) ────────────────────────────────────────
 * Este documento representa "lo que se ordenó al proveedor": encabezado de la
 * orden (folio, fecha, referencia, tipo, entrega estimada), datos del proveedor,
 * los renglones de producto (`detalles[]`) y el resumen financiero.
 *
 * NO se incluyen las recepciones (`recepciones[]`), de forma deliberada. Una
 * orden de compra es el documento de lo solicitado, no un reporte de estado en
 * vivo: mezclar "lo recibido hasta ahora" en el PDF que se envía al proveedor
 * confundiría el propósito del documento (el proveedor necesita saber qué se le
 * pidió, no cuánto lleva entregado la bodega). El avance de recepciones ya se
 * consulta en el detalle para uso interno. Si en el futuro se requiere un
 * documento de "pendiente por surtir", debe ser un documento distinto, no este.
 *
 * ─── ORDEN CANCELADA ─────────────────────────────────────────────────────────
 * El PDF se descarga en todos los estatus, y SOLO la cancelada se marca (banner
 * con su `motivo_cancelacion`, marca de agua y leyenda en el pie de cada
 * página, todo de la plantilla). El correo al proveedor solo sale en 3/4/5
 * (`usePreparePurchaseOrderEmail`), así que su adjunto nunca lleva la marca.
 *
 * ─── IMPORTES OCULTOS ────────────────────────────────────────────────────────
 * El backend ELIMINA los campos financieros de la respuesta según el rol de
 * quien consulta, y este documento se genera con esa respuesta. Lo que no
 * viene no se pinta: las columnas Precio/Descuento/Importe se omiten si ningún
 * renglón las trae y cada renglón de totales sin su clave desaparece. Nada se
 * recalcula.
 */
import { View } from "@react-pdf/renderer";
import type { PurchaseOrderDetail, PurchaseOrderDetalle } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import {
  hasVariantSku,
  variantAttributesCaption,
} from "@/src/features/purchase-orders/utils/purchaseOrderLines";
import { purchaseOrderDeliveryRows } from "@/src/features/purchase-orders/utils/purchaseOrderDelivery";
import { formatIvaPercent } from "@/src/features/purchase-orders/utils/purchaseOrderFinance";
import { purchaseOrderPdfDescriptor } from "@/src/features/purchase-orders/utils/purchaseOrderPdfDescriptor";
import { formatMoneyValue, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
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

type PurchaseOrderPdfDocumentProps = {
  order: PurchaseOrderDetail;
  company: PdfCompany | null;
};

export const PurchaseOrderPdfDocument = ({ order, company }: PurchaseOrderPdfDocumentProps) => {
  const detalles = order.detalles ?? [];
  // Importes en la MONEDA DE LA ORDEN; solo se llama con un valor presente.
  const money = (value: string) => formatMoneyValue(value, order.moneda_codigo);
  // `undefined` = la clave no vino (rol sin importes): el renglón se omite.
  const moneyIfPresent = (value: string | undefined) =>
    value === undefined ? undefined : money(value);
  // Descuento, flete y seguros solo aparecen cuando son mayores a cero.
  const moneyIfPositive = (value: string | undefined) =>
    value !== undefined && safeParseAmount(value) > 0 ? money(value) : undefined;
  const entrega = purchaseOrderDeliveryRows(order);

  const columns: PdfColumn<PurchaseOrderDetalle>[] = [
    // Columna SKU solo si algún renglón se compró por SKU (PT, EC-657).
    ...(hasVariantSku(detalles)
      ? [
          {
            id: "sku",
            header: "SKU",
            flex: 2,
            cell: (item: PurchaseOrderDetalle) => item.producto_variante_sku ?? "-",
          },
        ]
      : []),
    {
      id: "descripcion",
      header: "Descripción",
      flex: 4,
      cell: (item) => {
        // "Color · Talla" bajo la descripción de un renglón con variante (EC-684).
        const atributos = variantAttributesCaption(
          item.descripcion,
          item.producto_variante_color,
          item.producto_variante_talla,
        );
        return (
          <View>
            <PdfCellText bold>{item.descripcion}</PdfCellText>
            {atributos ? <PdfCellCaption>{atributos}</PdfCellCaption> : null}
          </View>
        );
      },
    },
    {
      id: "cantidad",
      header: "Cantidad",
      flex: 1.2,
      align: "right",
      cell: (item) => item.cantidad.toLocaleString("es-MX"),
    },
    {
      id: "precio",
      header: "Precio u.",
      flex: 1.5,
      align: "right",
      field: "precio",
      cell: (item) => moneyIfPresent(item.precio) ?? "",
    },
    {
      id: "descuento",
      header: "Descuento",
      flex: 1.5,
      align: "right",
      field: "descuento",
      cell: (item) => moneyIfPresent(item.descuento) ?? "",
    },
    {
      id: "importe",
      header: "Importe",
      flex: 1.5,
      align: "right",
      bold: true,
      field: "importe",
      cell: (item) => moneyIfPresent(item.importe) ?? "",
    },
  ];

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={purchaseOrderPdfDescriptor(order)}
      title="Orden de compra"
      subtitle={order.proveedor_nombre || "-"}
      date={{ label: "Fecha OC", value: formatLocalDate(order.fecha_oc) }}
      footerDetail={order.proveedor_nombre || "-"}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DEL PROVEEDOR"
          items={[
            { label: "Proveedor", value: order.proveedor_nombre || "-" },
            { label: "Correo", value: order.proveedor_correo || "-" },
          ]}
        />
        <PdfInfoCard
          title="DATOS DE LA ORDEN"
          items={[
            { label: "Referencia", value: order.referencia || "-" },
            { label: "Tipo", value: order.tipo || "-" },
            { label: "Entrega estimada", value: formatLocalDate(order.fecha_entrega_estimada) },
          ]}
        />
      </PdfCardRow>

      {/* Entrega (EC-796): a dónde envía el proveedor. La dirección es la de la
          sucursal de la orden; sin capturar se dice explícitamente. */}
      <PdfCardRow>
        <PdfInfoCard
          title="DIRECCIÓN DE ENTREGA"
          items={[
            { label: "Almacén destino", value: entrega.almacen },
            { label: "Dirección", value: entrega.direccion },
            { label: "Teléfono", value: entrega.telefono },
          ]}
        />
      </PdfCardRow>

      <PdfLineItemsTable
        title="PRODUCTOS SOLICITADOS"
        rows={detalles}
        columns={columns}
        emptyMessage="Esta orden no tiene productos registrados."
      />

      <PdfTotals
        rows={[
          // `total_piezas` NO es un campo financiero: llega siempre.
          { label: "Piezas totales", value: order.total_piezas?.toLocaleString("es-MX") ?? "0" },
          { label: "Subtotal", value: moneyIfPresent(order.subtotal) },
          { label: "Descuento", value: moneyIfPositive(order.descuento) },
          { label: "Flete", value: moneyIfPositive(order.flete) },
          { label: "Seguros", value: moneyIfPositive(order.seguros) },
          {
            label:
              order.porcentaje_iva === undefined
                ? "IVA"
                : `IVA (${formatIvaPercent(order.porcentaje_iva)}%)`,
            value: moneyIfPresent(order.total_iva),
          },
          { label: "TOTAL", value: moneyIfPresent(order.gran_total), emphasis: true },
        ]}
      />

      <PdfNotes text={order.observaciones} />
    </DocumentPdfLayout>
  );
};
