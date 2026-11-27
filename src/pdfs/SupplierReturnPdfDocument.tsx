/**
 * Documento PDF de una devolución a proveedor (folio DVP, EC-976), sobre la
 * plantilla base `DocumentPdfLayout` (EC-855): el marco (empresa activa, folio,
 * fecha, marca de cancelado, pie paginado) es el de todos los documentos; aquí
 * solo va el cuerpo. Estructura de la recepción (`ReceiptPdfDocument`).
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * - Datos: estatus, recepción, OC, quién registró y el motivo.
 * - Proveedor y almacén: proveedor, almacén y sucursal (EC-975). `almacen_nombre`
 *   puede llegar `""`: sale "—".
 * - Renglones con SKU, color y talla (nucleo-erp#1422, `null` sin variante →
 *   "—"); las columnas de SKU, color y talla solo aparecen si algún renglón
 *   trae el dato, como la talla de la recepción.
 * - Importes en MXN, como en el detalle: la respuesta no trae `moneda`, pero el
 *   backend valúa SIEMPRE en pesos (`_costo_oc` convierte la OC en otra moneda
 *   con su `tipo_cambio`). No los quita por rol; se imprimen tal cual, sin
 *   recalcular (el total es el `total` de la respuesta). El costo unitario llega
 *   con 8 decimales y se imprime con hasta 4, para que cantidad × costo cuadre
 *   con el importe (0.0040 no sale como 0.00).
 */
import type {
  SupplierReturn,
  SupplierReturnLine,
} from "@/src/features/supplier-returns/interfaces/supplier-return.interface";
import { supplierReturnStatusEntry } from "@/src/features/supplier-returns/constants/supplierReturns";
import { supplierReturnPdfDescriptor } from "@/src/features/supplier-returns/utils/supplierReturnPdf";
import { formatExactQuantityValue, formatMoneyValue, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDateTime } from "@/src/utils/formatDate";
import { textOrDash } from "@/src/utils/textOrDash";
import {
  DocumentPdfLayout,
  PdfCardRow,
  PdfInfoCard,
  PdfLineItemsTable,
  PdfNotes,
  PdfTotals,
  type PdfColumn,
} from "./shared/DocumentPdfLayout";
import { conditionalColumn } from "./shared/documentPdfColumns";
import type { PdfCompany } from "./shared/documentPdfModel";
import { pdfCurrencyItems, pdfMoney } from "./shared/financeDocumentPdf";

type SupplierReturnPdfDocumentProps = {
  supplierReturn: SupplierReturn;
  company: PdfCompany | null;
};

/** Moneda de los importes: el backend valúa la devolución en pesos (`_costo_oc`). */
const SUPPLIER_RETURN_MONEDA = "MXN";
const money = pdfMoney(SUPPLIER_RETURN_MONEDA);
/** Costo unitario con hasta 4 decimales (llega con 8). */
const unitCost = (value: string): string =>
  formatMoneyValue(value, SUPPLIER_RETURN_MONEDA, { maximumFractionDigits: 4 });

/**
 * Σ cantidades a 4 decimales (la escala del backend), como texto decimal: cada
 * término se lleva a diezmilésimos ENTEROS antes de sumar (sin residuos de
 * punto flotante) y el texto se arma desde ese entero, así que nunca sale en
 * notación exponencial.
 */
export const totalCantidadDevuelta = (detalles: readonly Pick<SupplierReturnLine, "cantidad">[]): string => {
  const units = detalles.reduce((sum, linea) => sum + Math.round(safeParseAmount(linea.cantidad) * 10_000), 0);
  const digits = (units < 0 ? -BigInt(units) : BigInt(units)).toString().padStart(5, "0");
  return `${units < 0 ? "-" : ""}${digits.slice(0, -4)}.${digits.slice(-4)}`;
};

export const SupplierReturnPdfDocument = ({ supplierReturn, company }: SupplierReturnPdfDocumentProps) => {
  const detalles = supplierReturn.detalles ?? [];
  const recepcionText = `Recepción ${textOrDash(supplierReturn.recepcion_folio)}`;

  const columns: PdfColumn<SupplierReturnLine>[] = [
    ...conditionalColumn(detalles, (linea) => linea.producto_variante_sku, {
      id: "sku",
      header: "SKU",
      flex: 6.65,
      cell: (linea) => textOrDash(linea.producto_variante_sku),
    }),
    {
      id: "producto",
      header: "Producto",
      flex: 12,
      bold: true,
      cell: (linea) => textOrDash(linea.producto_nombre),
    },
    ...conditionalColumn(detalles, (linea) => linea.producto_variante_color, {
      id: "color",
      header: "Color",
      flex: 4.45,
      cell: (linea) => textOrDash(linea.producto_variante_color),
    }),
    ...conditionalColumn(detalles, (linea) => linea.producto_variante_talla, {
      id: "talla",
      header: "Talla",
      flex: 2.55,
      cell: (linea) => textOrDash(linea.producto_variante_talla),
    }),
    {
      id: "cantidad",
      header: "Cantidad",
      flex: 4.6,
      align: "right",
      bold: true,
      cell: (linea) => formatExactQuantityValue(linea.cantidad),
    },
    {
      id: "costo_unitario",
      header: "Costo unitario",
      flex: 5.6,
      align: "right",
      cell: (linea) => unitCost(linea.costo_unitario),
    },
    {
      id: "importe",
      header: "Importe",
      flex: 6,
      align: "right",
      cell: (linea) => money(linea.importe),
    },
  ];

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={supplierReturnPdfDescriptor(supplierReturn)}
      title="Devolución a proveedor"
      subtitle={recepcionText}
      date={{ label: "Fecha", value: formatShortDateTime(supplierReturn.fecha) }}
      footerDetail={recepcionText}
    >
      <PdfCardRow>
        <PdfInfoCard
          title="DATOS DE LA DEVOLUCIÓN"
          items={[
            { label: "Estatus", value: textOrDash(supplierReturnStatusEntry(supplierReturn.estatus).label) },
            { label: "Recepción", value: textOrDash(supplierReturn.recepcion_folio) },
            { label: "Orden de compra", value: textOrDash(supplierReturn.orden_compra_folio) },
            { label: "Registró", value: textOrDash(supplierReturn.usuario_nombre) },
            ...pdfCurrencyItems(SUPPLIER_RETURN_MONEDA, null),
          ]}
        />
        <PdfInfoCard
          title="PROVEEDOR Y ALMACÉN"
          items={[
            { label: "Proveedor", value: textOrDash(supplierReturn.proveedor_nombre) },
            { label: "Almacén", value: textOrDash(supplierReturn.almacen_nombre) },
            { label: "Sucursal", value: textOrDash(supplierReturn.sucursal_nombre) },
          ]}
        />
      </PdfCardRow>

      <PdfLineItemsTable
        title="RENGLONES DEVUELTOS"
        rows={detalles}
        columns={columns}
        emptyMessage="Esta devolución no tiene renglones."
      />

      <PdfTotals
        rows={[
          { label: "Renglones", value: detalles.length.toLocaleString("es-MX") },
          { label: "Cantidad devuelta", value: formatExactQuantityValue(totalCantidadDevuelta(detalles)) },
          { label: "Total", value: money(supplierReturn.total), emphasis: true },
        ]}
      />

      <PdfNotes title="MOTIVO" text={supplierReturn.motivo} />
    </DocumentPdfLayout>
  );
};
