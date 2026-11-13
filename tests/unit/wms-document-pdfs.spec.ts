import { expect, test } from "@playwright/test";
import type { Packing, PackingDetalleLine } from "@/src/features/packing/interfaces/packing.interface";
import { packingPdfDescriptor } from "@/src/features/packing/utils/packingPdf";
import { packingPdfSource } from "@/src/features/packing/utils/packingPdfSource";
import type { Picking, PickingDetalleLine } from "@/src/features/picking/interfaces/picking.interface";
import { pickingPdfDescriptor } from "@/src/features/picking/utils/pickingPdf";
import { pickingPdfSource } from "@/src/features/picking/utils/pickingPdfSource";
import type {
  TransferenciaDetail,
  TransferenciaDetalleLine,
} from "@/src/features/stock-transfers/interfaces/stock-transfer.interface";
import { stockTransferPdfDescriptor } from "@/src/features/stock-transfers/utils/stockTransferPdf";
import { stockTransferPdfSource } from "@/src/features/stock-transfers/utils/stockTransferPdfSource";
import { PackingPdfDocument } from "@/src/pdfs/PackingPdfDocument";
import { PickingPdfDocument } from "@/src/pdfs/PickingPdfDocument";
import { StockTransferPdfDocument } from "@/src/pdfs/StockTransferPdfDocument";
import {
  DocumentPdfLayout,
  PdfInfoCard,
  PdfLineItemsTable,
  type PdfColumn,
} from "@/src/pdfs/shared/DocumentPdfLayout";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { visiblePdfColumns, type DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { elementsOf, pdfCardItems, type TreeElement } from "./support/pdfElementTree";

/**
 * PDF de los documentos de WMS (EC-858): surtido (picking), embarque (packing)
 * y traspaso. Nombres de archivo con las series PICK/PACK/TR, marcas de
 * cancelado (y las leyendas CANCELADA/FALLIDA del traspaso), cliente del
 * pedido, SKU/color/talla del backend en líneas de catálogo y de muestra,
 * columnas condicionales y que la descarga lee el detalle fresco del servicio.
 * Los fixtures copian las respuestas reales de nucleo-erp main (EC-882):
 * PICK-000038, PACK-000017, TR-00032 y TR-00033.
 */

const COMPANY = { name: "LAZZAR MEXICO", rfc: "LME010101AAA" };
const CLIENTE = { id: 29, nombre: "PRUEBA CLIENTE RECHAZO", razon_social: "PRUEBA CLIENTE RECHAZO SA DE CV", rfc: "XAXX010101000" };

const fileName = (descriptor: DocumentPdfDescriptor) =>
  documentPdfFileName(descriptor.type, descriptor.folio, descriptor.id);

/** Elementos del documento y lectores de sus tarjetas y tablas. */
function read(root: unknown) {
  const elements = elementsOf(root);
  const layout = elements.find((element) => element.type === DocumentPdfLayout) as TreeElement;
  const card = (title: string) =>
    Object.fromEntries(pdfCardItems(elements, title).map((item) => [item.label, item.value]));
  const cardTitles = elements.filter((element) => element.type === PdfInfoCard).map((element) => element.props.title);
  const table = elements.find((element) => element.type === PdfLineItemsTable) as TreeElement;
  const { rows, columns } = table.props as { rows: unknown[]; columns: PdfColumn<unknown>[] };
  const visible = visiblePdfColumns(columns, rows);
  return {
    layout: layout.props as { subtitle?: string | null; footerDetail?: string | null; date?: { label: string; value: string } },
    card,
    cardTitles,
    headers: visible.map((column) => column.header),
    cells: rows.map((row, index) => Object.fromEntries(visible.map((column) => [column.header, column.cell(row, index)]))),
  };
}

// ── Surtido (picking) ─────────────────────────────────────────────────────────

const pickingLinea = (overrides: Partial<PickingDetalleLine> = {}): PickingDetalleLine =>
  ({
    id: 202,
    pedido_detalle: 774,
    pedido_detalle_talla: 1365,
    talla_id: 4,
    talla_nombre: "G",
    producto: null,
    producto_nombre: "PRUEBA EC-671 REVIEW B (CLAUDE)",
    producto_variante: null,
    producto_variante_nombre: null,
    sku_muestra: "MP774-703-G",
    variante_produccion: 77,
    sku: "MP774-703-G",
    color_id: 76,
    color_nombre: "MARINO",
    ubicacion: null,
    ubicacion_nombre: null,
    lote: null,
    cantidad_solicitada: "1.0000",
    cantidad_asignada: "1.0000",
    cantidad_surtida: "1.0000",
    estado: "SURTIDA",
    operador: 1,
    operador_nombre: "Jesús Alberto Ibarra Morales",
    fecha_surtido: "2026-11-03T14:58:01.390117-06:00",
    diferencia: "0.0000",
    motivo_diferencia: null,
    observaciones: null,
    ...overrides,
  }) as PickingDetalleLine;

const picking = (overrides: Partial<Picking> = {}): Picking =>
  ({
    id: 105,
    folio: "PICK-000038",
    empresa: 1,
    sucursal: 1,
    pedido: 388,
    pedido_folio: "P-00140-2026",
    pedido_vinculado: { id: 388, folio: "P-00140-2026", cliente: CLIENTE },
    operador: 1,
    operador_nombre: "Jesús Alberto Ibarra Morales",
    almacen: 1,
    almacen_nombre: "PRODUCTO TERMINADO",
    almacen_destino: 28,
    almacen_destino_nombre: "APARTADOS",
    almacen_actual: 28,
    almacen_actual_nombre: "APARTADOS",
    transferencia: 154,
    transferencia_folio: "TR-00032",
    oleada: null,
    oleada_nombre: null,
    zona_almacen: null,
    zona_almacen_nombre: null,
    lote: null,
    lote_nombre: null,
    prioridad: "MEDIA",
    tipo: "ORDER_PICKING",
    estado: "Completado",
    fecha_inicio: null,
    fecha_fin: "2026-11-03T14:58:01.390117-06:00",
    // En el pasado: la pantalla lo marcaría vencido; el PDF no.
    fecha_limite: "2026-11-04T12:00:00-06:00",
    total_lineas: 1,
    total_lineas_completas: 1,
    observaciones: null,
    usuario: 1,
    usuario_nombre: "Jesús Alberto Ibarra Morales",
    created_at: "2026-11-03T14:58:01.236879-06:00",
    updated_at: "2026-11-03T14:58:01.390117-06:00",
    picking_detalle: [pickingLinea()],
    ordenes_trabajo: [],
    ...overrides,
  }) as Picking;

test.describe("PDF del surtido (picking)", () => {
  test("código PCK con la serie PICK; solo Cancelado lleva la marca, sin leyenda propia", () => {
    expect(fileName(pickingPdfDescriptor(picking()))).toBe("PICK-000038.pdf");
    expect(fileName(pickingPdfDescriptor(picking({ folio: "" })))).toBe("PCK-ID105.pdf");
    expect(pickingPdfDescriptor(picking({ id: 97, folio: "PICK-000031", estado: "Cancelado" }))).toEqual({
      type: "PCK",
      id: 97,
      folio: "PICK-000031",
      cancelled: true,
    });
    for (const estado of ["Pendiente", "Parcial", "Completado"] as const) {
      expect(pickingPdfDescriptor(picking({ estado })).cancelled).toBe(false);
    }
  });

  test("cliente del pedido, datos del surtido y la fecha límite sin marca de vencido", () => {
    const doc = read(PickingPdfDocument({ picking: picking(), company: COMPANY }));
    expect(doc.layout.subtitle).toBe("PRUEBA CLIENTE RECHAZO SA DE CV");
    expect(doc.card("CLIENTE")).toEqual({
      Cliente: "PRUEBA CLIENTE RECHAZO",
      "Razón social": "PRUEBA CLIENTE RECHAZO SA DE CV",
      RFC: "XAXX010101000",
    });
    expect(doc.card("DATOS DEL SURTIDO")).toMatchObject({
      Estatus: "Completado",
      Prioridad: "Media",
      Tipo: "Por pedido",
      Avance: "1 de 1 línea",
    });
    expect(doc.card("PEDIDO Y UBICACIÓN")).toMatchObject({
      Pedido: "P-00140-2026",
      "Ubicación actual": "APARTADOS",
      Traspaso: "TR-00032",
    });
    // Oleada y zona no vienen: no ocupan renglón.
    expect(Object.keys(doc.card("PEDIDO Y UBICACIÓN"))).not.toContain("Oleada");
    expect(JSON.stringify(doc.card("DATOS DEL SURTIDO")).toLowerCase()).not.toContain("vencid");
  });

  test("la línea de muestra lleva SKU, color y talla del backend; sin ubicación no hay columna", () => {
    const doc = read(PickingPdfDocument({ picking: picking(), company: COMPANY }));
    expect(doc.headers).toEqual(["SKU", "Producto", "Color", "Talla", "Solicitada", "Asignada", "Surtida", "Diferencia", "Estatus"]);
    expect(doc.cells[0]).toMatchObject({
      SKU: "MP774-703-G",
      Producto: "PRUEBA EC-671 REVIEW B (CLAUDE)",
      Color: "MARINO",
      Talla: "G",
      Surtida: "1",
      Estatus: "Surtida",
    });
  });

  test("oleada, zona y ubicación aparecen en cuanto alguno las trae", () => {
    const doc = read(
      PickingPdfDocument({
        picking: picking({
          oleada_nombre: "Oleada 3",
          zona_almacen_nombre: "Zona A",
          picking_detalle: [pickingLinea(), pickingLinea({ id: 203, ubicacion_nombre: "PT - 1-2-3-4" })],
        }),
        company: COMPANY,
      }),
    );
    expect(doc.card("PEDIDO Y UBICACIÓN")).toMatchObject({ Oleada: "Oleada 3", Zona: "Zona A" });
    expect(doc.headers).toContain("Ubicación");
    expect(doc.cells.map((cell) => cell["Ubicación"])).toEqual(["—", "PT - 1-2-3-4"]);
  });

  test("una respuesta sin las claves de EC-882 omite SKU, color y la tarjeta de cliente", () => {
    // Línea como la mandaba el backend antes de EC-882: sin `sku` ni `color_nombre`.
    const anterior: Partial<PickingDetalleLine> = { ...pickingLinea() };
    delete anterior.sku;
    delete anterior.color_nombre;
    const doc = read(
      PickingPdfDocument({
        picking: picking({
          pedido_vinculado: { id: 388, folio: "P-00140-2026" },
          picking_detalle: [anterior as PickingDetalleLine],
        }),
        company: COMPANY,
      }),
    );
    expect(doc.headers).not.toContain("SKU");
    expect(doc.headers).not.toContain("Color");
    expect(doc.cardTitles).not.toContain("CLIENTE");
  });
});

// ── Embarque (packing) ────────────────────────────────────────────────────────

const packingLinea = (overrides: Partial<PackingDetalleLine> = {}): PackingDetalleLine =>
  ({
    id: 42,
    packing: 25,
    caja: null,
    caja_numero: null,
    picking_detalle: 178,
    cantidad_empacada: "1.0000",
    estado: "PENDIENTE",
    observaciones: null,
    producto: 8287,
    producto_nombre: "BATA EJECUTIVA DAMA",
    producto_variante: 1629,
    producto_variante_nombre: "BATA EJECUTIVA DAMA BLANCO",
    pedido_detalle: 688,
    pedido_detalle_talla: 1197,
    talla_id: 3,
    talla_nombre: "M",
    variante_produccion: null,
    sku_muestra: null,
    sku: "6000100M",
    color_id: 28,
    color_nombre: "BLANCO",
    cantidad_asignada: "2.0000",
    cantidad_solicitada: "2.0000",
    cantidad_surtida: "2.0000",
    ubicacion: null,
    ubicacion_nombre: null,
    ...overrides,
  }) as PackingDetalleLine;

const packing = (overrides: Partial<Packing> = {}): Packing =>
  ({
    id: 25,
    folio: "PACK-000017",
    estado: "PENDIENTE",
    numero_cajas: 1,
    peso_total: "0.000",
    volumen_total: "0.000",
    observaciones: "PRUEBA QA EC-605 surtido parcial",
    fecha_inicio: null,
    fecha_fin: null,
    created_at: "2026-10-27T12:18:06.346972-06:00",
    updated_at: "2026-10-27T12:18:06.346983-06:00",
    empresa: 1,
    sucursal: 1,
    pedido: 332,
    pedido_folio: "P-00104-2026",
    pedido_vinculado: {
      id: 332,
      folio: "P-00104-2026",
      cliente: { id: 47, nombre: "QA-ERP-211026 CONTACTO", razon_social: "QA-ERP-211026 FLUJO INTEGRAL", rfc: "QAZ010101AB8" },
    },
    picking: 99,
    picking_folio: "PICK-000033",
    picking_estado: "Parcial",
    picking_almacen: 1,
    picking_almacen_nombre: "PRODUCTO TERMINADO",
    operador: 4,
    operador_nombre: "Luis Alberto Ceja Chavez",
    usuario: 4,
    usuario_nombre: "Luis Alberto Ceja Chavez",
    packing_detalle: [packingLinea()],
    ...overrides,
  }) as Packing;

test.describe("PDF del embarque (packing)", () => {
  test("código PAK con la serie PACK; solo CANCELADO lleva la marca", () => {
    expect(fileName(packingPdfDescriptor(packing()))).toBe("PACK-000017.pdf");
    expect(packingPdfDescriptor(packing({ estado: "CANCELADO" }))).toMatchObject({ cancelled: true });
    expect(packingPdfDescriptor(packing({ estado: "CANCELADO" })).cancelledLabel).toBeUndefined();
    expect(packingPdfDescriptor(packing({ estado: "COMPLETADO" })).cancelled).toBe(false);
  });

  test("cliente, surtido de origen y la línea de catálogo con su SKU, color y talla", () => {
    const doc = read(PackingPdfDocument({ packing: packing(), company: COMPANY }));
    expect(doc.layout.subtitle).toBe("QA-ERP-211026 FLUJO INTEGRAL");
    expect(doc.card("CLIENTE")).toMatchObject({ Cliente: "QA-ERP-211026 CONTACTO", RFC: "QAZ010101AB8" });
    expect(doc.card("SURTIDO DE ORIGEN")).toMatchObject({
      Surtido: "PICK-000033",
      "Estatus del surtido": "Parcial",
      Almacén: "PRODUCTO TERMINADO",
      Pedido: "P-00104-2026",
    });
    expect(doc.card("DATOS DEL EMBARQUE")).toMatchObject({ Cajas: "1", "Peso total": "0 kg" });
    expect(doc.headers).toEqual(["SKU", "Producto", "Color", "Talla", "Solicitada", "Asignada", "Surtida", "Empacada", "Estatus"]);
    expect(doc.cells[0]).toMatchObject({ SKU: "6000100M", Producto: "BATA EJECUTIVA DAMA BLANCO", Color: "BLANCO", Talla: "M", Empacada: "1" });
  });

  test("ubicación y caja solo si algún renglón las trae; la línea de muestra sale con sus datos", () => {
    const doc = read(
      PackingPdfDocument({
        packing: packing({
          packing_detalle: [
            packingLinea(),
            packingLinea({
              id: 43,
              caja_numero: 2,
              producto: null,
              producto_nombre: "MUESTRA X",
              producto_variante: null,
              producto_variante_nombre: null,
              variante_produccion: 77,
              sku_muestra: "MP774-703-G",
              sku: "MP774-703-G",
              color_nombre: "MARINO",
              talla_nombre: "G",
            }),
          ],
        }),
        company: COMPANY,
      }),
    );
    expect(doc.headers).toContain("Caja");
    expect(doc.headers).not.toContain("Ubicación");
    expect(doc.cells.map((cell) => cell.Caja)).toEqual(["—", "2"]);
    expect(doc.cells[1]).toMatchObject({ SKU: "MP774-703-G", Producto: "MUESTRA X", Color: "MARINO", Talla: "G" });
  });
});

// ── Traspaso ──────────────────────────────────────────────────────────────────

const trLinea = (overrides: Partial<TransferenciaDetalleLine> = {}): TransferenciaDetalleLine => ({
  id: 212,
  producto: null,
  producto_nombre: "PRUEBA EC-671 REVIEW B (CLAUDE)",
  producto_variante: null,
  producto_variante_nombre: null,
  variante_produccion: 77,
  sku_muestra: "MP774-703-G",
  sku: "MP774-703-G",
  color_id: 76,
  color_nombre: "MARINO",
  talla_id: 4,
  talla_nombre: "G",
  cantidad: "1.0000",
  ubicacion_origen: null,
  ubicacion_origen_nombre: null,
  ubicacion_destino: null,
  ubicacion_destino_nombre: null,
  ...overrides,
});

const transfer = (overrides: Partial<TransferenciaDetail> = {}): TransferenciaDetail => ({
  id: 154,
  folio: "TR-00032",
  status: "COMPLETADA",
  observaciones: "Traspaso del picking PICK-000038",
  fecha_creacion: "2026-11-03T14:58:01.236879-06:00",
  almacen_origen: 1,
  almacen_origen_nombre: "PRODUCTO TERMINADO",
  almacen_destino: 28,
  almacen_destino_nombre: "APARTADOS",
  usuario: 1,
  usuario_nombre: "Jesús Alberto Ibarra Morales",
  transferencia_detalle: [trLinea()],
  ...overrides,
});

test.describe("PDF del traspaso", () => {
  test("código TR sin alias; CANCELADA y FALLIDA llevan la marca con su propia leyenda", () => {
    expect(fileName(stockTransferPdfDescriptor(transfer({ folio: "TR-00033" })))).toBe("TR-00033.pdf");
    expect(stockTransferPdfDescriptor(transfer())).toEqual({ type: "TR", id: 154, folio: "TR-00032", cancelled: false });
    expect(stockTransferPdfDescriptor(transfer({ status: "CANCELADA" }))).toMatchObject({
      cancelled: true,
      cancelledLabel: "CANCELADA",
    });
    expect(stockTransferPdfDescriptor(transfer({ status: "FALLIDA" }))).toMatchObject({
      cancelled: true,
      cancelledLabel: "FALLIDA",
    });
    for (const status of ["PENDIENTE", "EN_PROCESO"]) {
      expect(stockTransferPdfDescriptor(transfer({ status })).cancelled).toBe(false);
    }
  });

  test("la marca imprime la leyenda en el banner, la marca de agua y el pie", () => {
    const texts = (descriptor: DocumentPdfDescriptor) =>
      elementsOf(DocumentPdfLayout({ company: COMPANY, descriptor, title: "Traspaso entre almacenes", children: null }))
        .map((element) => element.props.children)
        .flat()
        .filter((child): child is string => typeof child === "string");
    const fallida = texts(stockTransferPdfDescriptor(transfer({ status: "FALLIDA" })));
    expect(fallida.filter((text) => text === "FALLIDA").length).toBe(3);
    expect(fallida).not.toContain("CANCELADO");
    // Sin leyenda propia, la marca de siempre.
    const cancelado = texts(pickingPdfDescriptor(picking({ estado: "Cancelado" })));
    expect(cancelado.filter((text) => text === "CANCELADO").length).toBe(3);
  });

  test("TR-00032: la línea de muestra de un surtido sale con nombre, SKU, color y talla", () => {
    const doc = read(StockTransferPdfDocument({ transfer: transfer(), company: COMPANY }));
    expect(doc.layout.subtitle).toBe("De PRODUCTO TERMINADO a APARTADOS");
    // La fecha del encabezado es el alta, como en picking y packing; la tarjeta trae la hora.
    expect(doc.layout.date?.label).toBe("Alta");
    expect(doc.card("ALMACENES")).toEqual({ Origen: "PRODUCTO TERMINADO", Destino: "APARTADOS" });
    expect(doc.card("DATOS DEL TRASPASO")).toMatchObject({ Estatus: "Completada" });
    expect(doc.headers).toEqual(["SKU", "Producto", "Color", "Talla", "Cantidad"]);
    expect(doc.cells[0]).toEqual({
      SKU: "MP774-703-G",
      Producto: "PRUEBA EC-671 REVIEW B (CLAUDE)",
      Color: "MARINO",
      Talla: "G",
      Cantidad: "1",
    });
  });

  test("TR-00033: línea de catálogo; las ubicaciones aparecen en cuanto alguna viene", () => {
    const catalogo = trLinea({
      id: 217,
      producto: 15166,
      producto_nombre: "CHAMARRA BUENOS AIRES",
      producto_variante: 3221,
      producto_variante_nombre: "CHAMARRA BUENOS AIRES - MARINO - 2XCH",
      variante_produccion: null,
      sku_muestra: null,
      sku: "30018",
      talla_id: 13,
      talla_nombre: "2XCH",
      ubicacion_destino_nombre: "APARTADOS QA - 1-1-1-1",
    });
    const doc = read(
      StockTransferPdfDocument({ transfer: transfer({ folio: "TR-00033", transferencia_detalle: [catalogo] }), company: COMPANY }),
    );
    expect(doc.headers).toEqual(["SKU", "Producto", "Color", "Talla", "Cantidad", "Ubicación destino"]);
    expect(doc.cells[0]).toMatchObject({
      SKU: "30018",
      // El nombre de la variante, como en el diálogo; sin variante, el del producto.
      Producto: "CHAMARRA BUENOS AIRES - MARINO - 2XCH",
      Talla: "2XCH",
    });
  });
});

// ── Fuentes: el detalle fresco del servicio ───────────────────────────────────

/** Corre una fuente con `v1_api.get` sustituido y devuelve las URL pedidas y el archivo. */
async function download<Detail>(
  detail: Detail,
  run: (render: (detail: Detail) => Promise<Blob>) => (context: { company: typeof COMPANY }) => Promise<{
    descriptor: DocumentPdfDescriptor;
  }>,
) {
  const { v1_api } = await import("@/src/api/v1.api");
  const originalGet = v1_api.get;
  const urls: string[] = [];
  v1_api.get = (async (url: string) => {
    urls.push(url);
    return { data: detail };
  }) as typeof v1_api.get;
  try {
    const file = await run(async () => new Blob(["%PDF-fake"], { type: "application/pdf" }))({ company: COMPANY });
    return { urls, descriptor: file.descriptor };
  } finally {
    v1_api.get = originalGet;
  }
}

test.describe("fuentes de los PDF de WMS", () => {
  test("cada una lee su detalle con el servicio y nombra el archivo con lo que leyó", async () => {
    const pk = await download(picking({ estado: "Cancelado" }), (render) =>
      pickingPdfSource({ pickingId: 105, render }),
    );
    expect(pk.urls).toEqual(["/wms/pickings/105/"]);
    expect(pk.descriptor).toMatchObject({ folio: "PICK-000038", cancelled: true });

    const pa = await download(packing(), (render) => packingPdfSource({ packingId: 25, render }));
    expect(pa.urls).toEqual(["/wms/packings/25/"]);
    expect(fileName(pa.descriptor)).toBe("PACK-000017.pdf");

    const tr = await download(transfer({ status: "FALLIDA" }), (render) =>
      stockTransferPdfSource({ transferId: 154, render }),
    );
    expect(tr.urls).toEqual(["/wms/transferencias/154/"]);
    expect(tr.descriptor).toMatchObject({ cancelled: true, cancelledLabel: "FALLIDA" });
  });
});
