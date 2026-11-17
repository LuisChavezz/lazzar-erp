import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import path from "node:path";
import type { CorteMangaOrder } from "@/src/features/corte-manga/interfaces/corte-manga-order.interface";
import type { EmbroideryOrderDetail } from "@/src/features/embroidery/interfaces/embroidery.interface";
import type { PedidoDetail } from "@/src/features/orders/interfaces/order.interface";
import type { Packing } from "@/src/features/packing/interfaces/packing.interface";
import type { Picking } from "@/src/features/picking/interfaces/picking.interface";
import type { ProductionOrderOnboarding } from "@/src/features/production-orders/interfaces/production-order.interface";
import type { PurchaseOrderDetail } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import type { ReceiptDetail } from "@/src/features/receipts/interfaces/receipt.interface";
import type { ReflectiveOrderDetail } from "@/src/features/reflective-orders/interfaces/reflective-order.interface";
import type { TransferenciaDetail } from "@/src/features/stock-transfers/interfaces/stock-transfer.interface";
import { CorteMangaOrderPdfDocument } from "@/src/pdfs/CorteMangaOrderPdfDocument";
import { EmbroideryOrderPdfDocument } from "@/src/pdfs/EmbroideryOrderPdfDocument";
import { PackingPdfDocument } from "@/src/pdfs/PackingPdfDocument";
import { PedidoPdfDocument } from "@/src/pdfs/PedidoPdfDocument";
import { PickingPdfDocument } from "@/src/pdfs/PickingPdfDocument";
import { ProductionOrderPdfDocument } from "@/src/pdfs/ProductionOrderPdfDocument";
import { PurchaseOrderPdfDocument } from "@/src/pdfs/PurchaseOrderPdfDocument";
import { ReceiptPdfDocument } from "@/src/pdfs/ReceiptPdfDocument";
import { ReflectiveOrderPdfDocument } from "@/src/pdfs/ReflectiveOrderPdfDocument";
import { StockTransferPdfDocument } from "@/src/pdfs/StockTransferPdfDocument";
import { PdfLineItemsTable, type PdfColumn } from "@/src/pdfs/shared/DocumentPdfLayout";
import { documentPdfStyles } from "@/src/pdfs/shared/DocumentPdfStyles";
import { visiblePdfColumns } from "@/src/pdfs/shared/documentPdfModel";
import { elementsOf } from "./support/pdfElementTree";

/**
 * Cada palabra de cada encabezado cabe en su columna (EC-891). Los encabezados
 * se parten solo entre palabras (`wholeWords` en `PdfLineItemsTable`), así que
 * una palabra más ancha que su columna ya no se separa en sílabas: se saldría
 * sobre el encabezado de al lado. Nada en el layout lo impide, de modo que esta
 * prueba recorre TODAS las tablas de los documentos, con todas sus columnas
 * condicionales visibles (el caso más angosto), y mide cada palabra con las
 * métricas reales de Arimo contra el ancho de texto de su columna.
 *
 * Ancho de texto de una columna: yoga reparte el `flex` DESPUÉS de restar el
 * relleno de todas las celdas, así que texto = (ancho de la fila − 2·3·n)·f/S,
 * con la fila = A4 − márgenes de la página − relleno de la fila. El modelo se
 * validó contra las posiciones reales de PDF generados (error < 0.01 pt en 64
 * columnas de seis documentos).
 */

type Font = { unitsPerEm: number; layout(text: string): { advanceWidth: number } };
// El motor de fuentes de react-pdf, con la misma Arimo que incrusta el PDF.
const fontkit = createRequire(path.join(process.cwd(), "package.json"))("fontkit") as {
  openSync(file: string): Font;
};
const ARIMO_BOLD = fontkit.openSync(path.join(process.cwd(), "public/fonts/pdf/Arimo-Bold.ttf"));

const A4_WIDTH = 595.28;
const num = (style: unknown, key: string) => (style as Record<string, number>)[key];
const PAGE_PADDING = num(documentPdfStyles.page, "paddingHorizontal");
const ROW_PADDING = num(documentPdfStyles.tableRow, "paddingHorizontal");
const CELL_PADDING = num(documentPdfStyles.tableCellBox, "paddingHorizontal");
const HEADER_FONT_SIZE = num(documentPdfStyles.tableHeaderCell, "fontSize");

const headerWordWidth = (word: string) =>
  (ARIMO_BOLD.layout(word).advanceWidth * HEADER_FONT_SIZE) / ARIMO_BOLD.unitsPerEm;

/** Ancho de texto (pt) de cada columna visible. */
function columnTextWidths(columns: readonly PdfColumn<unknown>[]): number[] {
  const row = A4_WIDTH - 2 * PAGE_PADDING - 2 * ROW_PADDING;
  const free = row - 2 * CELL_PADDING * columns.length;
  const totalFlex = columns.reduce((sum, column) => sum + column.flex, 0);
  return columns.map((column) => (free * column.flex) / totalFlex);
}

type Table = { title: string; headers: string[]; widths: number[] };

/** Las tablas del documento, con sus columnas visibles y el ancho de texto de cada una. */
function tablesOf(tree: unknown): Table[] {
  return elementsOf(tree)
    .filter((element) => element.type === PdfLineItemsTable)
    .map((element) => {
      const { title, columns, rows } = element.props as {
        title: string;
        columns: PdfColumn<unknown>[];
        rows: unknown[];
      };
      const visible = visiblePdfColumns(columns, rows);
      return { title, headers: visible.map((column) => column.header), widths: columnTextWidths(visible) };
    });
}

/** Palabras de encabezado que no caben en su columna. */
function overflowingWords(tables: Table[]): string[] {
  return tables.flatMap((table) =>
    table.headers.flatMap((header, index) =>
      header
        .split(" ")
        .filter((word) => headerWordWidth(word) > table.widths[index])
        .map(
          (word) =>
            `${table.title} › ${header}: "${word}" mide ${headerWordWidth(word).toFixed(1)} pt ` +
            `y la columna ${table.widths[index].toFixed(1)} pt`,
        ),
    ),
  );
}

// ── Documentos con todas sus columnas condicionales visibles ─────────────────

const COMPANY = { name: "LAZZAR MEXICO", rfc: null };
const CLIENTE = { id: 1, nombre: "CLIENTE", razon_social: "CLIENTE SA DE CV", rfc: "XAXX010101000" };

const garment = {
  id: 1,
  producto: 7,
  producto_nombre: "CAMISA",
  color_nombre: "AZUL",
  talla_nombre: "2XCH",
  cantidad: 12500,
  sku: "10012-100-2XCH",
  cantidad_asignada: 12500,
  cantidad_pedido: 12500,
  cantidad_pendiente: 0,
};

const wmsLine = {
  id: 1,
  sku: "10012-100-2XCH",
  producto_nombre: "CAMISA",
  color_nombre: "AZUL",
  talla_nombre: "2XCH",
  ubicacion_nombre: "CF-05-05-06",
};

const DOCUMENTS: { name: string; tree: () => unknown; tables: Record<string, string[]> }[] = [
  {
    name: "Orden de compra",
    tree: () =>
      PurchaseOrderPdfDocument({
        company: COMPANY,
        order: {
          id: 1,
          folio: "OC-00001-2026",
          detalles: [
            {
              id: 1,
              descripcion: "CAMISA",
              producto_variante_sku: "10012-100-2XCH",
              cantidad: 12500,
              precio: "1.00",
              descuento: "1.00",
              importe: "1.00",
            },
          ],
        } as unknown as PurchaseOrderDetail,
      }),
    tables: { "PRODUCTOS SOLICITADOS": ["SKU", "Descripción", "Cantidad", "Precio u.", "Descuento", "Importe"] },
  },
  {
    name: "Pedido",
    tree: () =>
      PedidoPdfDocument({
        company: COMPANY,
        currency: { codigo: "MXN", label: "MXN - Peso mexicano" },
        pedido: {
          id: 1,
          folio: "P-00001-2026",
          estatus: 3,
          tipo_pedido: 1,
          moneda: 1,
          detalles: [
            {
              id: 10,
              producto: 5,
              producto_nombre: "CAMISA",
              sku_base: "10012-100",
              cantidad_total: 2,
              precio_unitario: "50.00",
              subtotal_linea: "0.00",
              tallas: [{ id: 1, talla: 1, talla_nombre: "M", cantidad: 2, precio_unitario: "50.00", subtotal_talla: "0.00" }],
            },
          ],
          servicios_extras: [{ id: 1, nombre: "BORDADO", cantidad: 1, visible_en_factura: true, monto: "10.00" }],
          subtotal: "100.00",
          iva: 16,
          importe_iva: "16.00",
          gran_total: "116.00",
          forma_pago: "03",
        } as unknown as PedidoDetail,
      }),
    tables: {
      PRODUCTOS: ["#", "SKU", "Descripción", "Tallas", "Cantidad", "Precio u.", "Importe"],
      "SERVICIOS EXTRA": ["Servicio", "Cantidad", "Monto"],
    },
  },
  {
    name: "Recepción",
    tree: () =>
      ReceiptPdfDocument({
        company: COMPANY,
        receipt: {
          id: 1,
          tipo_origen: "OC",
          orden_compra_folio: "OC-00001-2026",
          folio: "RC-00001",
          estatus: 5,
          detalles: [
            {
              id: 1,
              producto: 7,
              producto_nombre: "CAMISA",
              producto_variante_sku: "10012-100-2XCH",
              producto_cod_proscai: "123",
              producto_variante_talla: "2XCH",
              cantidad_recibida: "12500.0000",
            },
          ],
        } as unknown as ReceiptDetail,
      }),
    tables: { "PRODUCTOS RECIBIDOS": ["SKU", "Producto", "Talla", "Recibido"] },
  },
  {
    name: "Orden de producción",
    tree: () =>
      ProductionOrderPdfDocument({
        company: COMPANY,
        op: {
          op_id: 1,
          folio_op: "2026-OP-00001",
          estatus_op: 1,
          pedidos: [{ id: 1, folio: "P-00001-2026", cliente: CLIENTE }],
          productos: [
            {
              nombre: "CHAMARRA",
              cantidades: { total: 7, tallas: [{ talla: "2XCH", color: "NEGRO", cantidad: 7 }] },
              habilitacion: [{ codigo: "2CES85AMA", descripcion: "CIERRE", unidad: "PZ", total: 14 }],
              habilitacion_con_desperdicio: [{ codigo: "2CES85AMA", descripcion: "CIERRE", unidad: "PZ", total: "14.0000" }],
            },
          ],
          consumos: [],
          consumos_resumen: [{ producto: 1, producto_nombre: "CIERRE", unidad: "PZ", planeado: "14", ajustes: "0", actual: "14" }],
        } as unknown as ProductionOrderOnboarding,
      }),
    tables: {
      PEDIDO: ["Pedido", "Cliente", "Razón social", "RFC"],
      "CHAMARRA · POR TALLA · 7 PIEZAS": ["Talla", "Color", "Cantidad"],
      "CHAMARRA · HABILITACIÓN": ["Código", "Descripción", "Unidad", "Total", "Con desperdicio"],
      CONSUMOS: ["Material", "Unidad", "Planeado", "Ajustes", "Actual"],
    },
  },
  {
    name: "Orden de bordado",
    tree: () =>
      EmbroideryOrderPdfDocument({
        company: COMPANY,
        order: { id: 1, folio_bordado: "2026-OB-00001", detalles: [garment] } as unknown as EmbroideryOrderDetail,
      }),
    tables: {
      "CAMISA · AZUL · 12,500 piezas": ["Talla", "SKU", "Bordado", "En esta orden", "Programado", "Pedido", "Pendiente"],
    },
  },
  {
    name: "Orden de reflejante",
    tree: () =>
      ReflectiveOrderPdfDocument({
        company: COMPANY,
        order: {
          id: 1,
          folio_reflejante: "2026-OR-00001",
          detalles: [{ ...garment, tipo_reflejante: "PLATEADO", posicion: "ESPALDA", metros: 1234.5 }],
        } as unknown as ReflectiveOrderDetail,
      }),
    tables: {
      "CAMISA · AZUL · 12,500 piezas": [
        "Talla", "SKU", "Reflejante", "Tipo", "Posición", "Metros", "En esta orden", "Programado", "Pedido", "Pendiente",
      ],
    },
  },
  {
    name: "Orden de corte de manga",
    tree: () =>
      CorteMangaOrderPdfDocument({
        company: COMPANY,
        order: { id: 1, folio_ocm: "2026-CM-00001", detalles: [garment] } as unknown as CorteMangaOrder,
      }),
    tables: { "CAMISA · AZUL · 12,500 piezas": ["Talla", "SKU", "En esta orden", "Programado", "Pedido", "Pendiente"] },
  },
  {
    name: "Orden de trabajo sin prendas",
    tree: () =>
      CorteMangaOrderPdfDocument({
        company: COMPANY,
        order: { id: 1, folio_ocm: "2026-CM-00002", detalles: [] } as unknown as CorteMangaOrder,
      }),
    tables: { "PRENDAS DE LA ORDEN": ["Talla"] },
  },
  {
    name: "Surtido (picking)",
    tree: () =>
      PickingPdfDocument({
        company: COMPANY,
        picking: {
          id: 1,
          folio: "PICK-000001",
          picking_detalle: [
            {
              ...wmsLine,
              cantidad_solicitada: "12500",
              cantidad_asignada: "12500",
              cantidad_surtida: "12500",
              diferencia: "-12500",
              estado: "SURTIDA",
            },
          ],
        } as unknown as Picking,
      }),
    tables: {
      "LÍNEAS DEL SURTIDO": [
        "SKU", "Producto", "Color", "Talla", "Ubicación", "Solicitada", "Asignada", "Surtida", "Diferencia", "Estatus",
      ],
    },
  },
  {
    name: "Embarque (packing)",
    tree: () =>
      PackingPdfDocument({
        company: COMPANY,
        packing: {
          id: 1,
          folio: "PACK-000001",
          packing_detalle: [
            {
              ...wmsLine,
              caja_numero: 999,
              cantidad_solicitada: "12500",
              cantidad_asignada: "12500",
              cantidad_surtida: "12500",
              cantidad_empacada: "12500",
              estado: "COMPLETADO",
            },
          ],
        } as unknown as Packing,
      }),
    tables: {
      "LÍNEAS DEL EMBARQUE": [
        "SKU", "Producto", "Color", "Talla", "Ubicación", "Caja", "Solicitada", "Asignada", "Surtida", "Empacada", "Estatus",
      ],
    },
  },
  {
    name: "Traspaso",
    tree: () =>
      StockTransferPdfDocument({
        company: COMPANY,
        transfer: {
          id: 1,
          folio: "TR-00001",
          transferencia_detalle: [
            {
              ...wmsLine,
              cantidad: "12500",
              ubicacion_origen_nombre: "CF-05-05-06",
              ubicacion_destino_nombre: "DF-04-06-16",
            },
          ],
        } as unknown as TransferenciaDetail,
      }),
    tables: {
      "LÍNEAS DEL TRASPASO": ["SKU", "Producto", "Color", "Talla", "Cantidad", "Ubicación origen", "Ubicación destino"],
    },
  },
];

test.describe("Encabezados de las tablas de los PDF", () => {
  for (const document of DOCUMENTS) {
    test(`${document.name}: cada palabra de cada encabezado cabe en su columna`, () => {
      const tables = tablesOf(document.tree());
      // Todas las columnas condicionales visibles: si un fixture deja de
      // mostrar alguna, la prueba dejaría de medir el caso más angosto.
      expect(Object.fromEntries(tables.map((table) => [table.title, table.headers]))).toEqual(document.tables);
      expect(overflowingWords(tables)).toEqual([]);
    });
  }

  test("detecta un encabezado que no cabe en su columna", () => {
    const columns: PdfColumn<unknown>[] = [
      { id: "a", header: "Producto", flex: 30, cell: () => "" },
      { id: "b", header: "Programado", flex: 1, cell: () => "" },
    ];
    const [overflow] = overflowingWords([
      { title: "PRUEBA", headers: columns.map((column) => column.header), widths: columnTextWidths(columns) },
    ]);
    expect(overflow).toContain('PRUEBA › Programado: "Programado"');
  });
});
