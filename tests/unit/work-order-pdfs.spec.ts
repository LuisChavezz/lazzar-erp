import { expect, test } from "@playwright/test";
import type { CorteMangaOrder } from "@/src/features/corte-manga/interfaces/corte-manga-order.interface";
import { corteMangaOrderPdfDescriptor } from "@/src/features/corte-manga/utils/corteMangaOrderPdf";
import type {
  EmbroideryOrderDetail,
  EmbroideryOrderDetailLine,
} from "@/src/features/embroidery/interfaces/embroidery.interface";
import {
  embroideryLineBordadoText,
  embroideryOrderPdfDescriptor,
  embroideryUbicacionText,
} from "@/src/features/embroidery/utils/embroideryOrderPdf";
import type {
  ReflectiveOrderDetail,
  ReflectiveOrderDetailLine,
} from "@/src/features/reflective-orders/interfaces/reflective-order.interface";
import {
  reflectiveOrderPdfDescriptor,
  reflectiveMetrosText,
} from "@/src/features/reflective-orders/utils/reflectiveOrderPdf";
import { CorteMangaOrderPdfDocument } from "@/src/pdfs/CorteMangaOrderPdfDocument";
import { EmbroideryOrderPdfDocument } from "@/src/pdfs/EmbroideryOrderPdfDocument";
import { ReflectiveOrderPdfDocument } from "@/src/pdfs/ReflectiveOrderPdfDocument";
import { DocumentPdfLayout, PdfInfoCard, PdfLineItemsTable, type PdfColumn } from "@/src/pdfs/shared/DocumentPdfLayout";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { visiblePdfColumns, type DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { elementsOf, pdfCardItems, type TreeElement } from "./support/pdfElementTree";

/**
 * PDF de las órdenes de bordado, reflejante y corte de manga (EC-857):
 * identidad y nombre del archivo, cliente del pedido, prendas agrupadas como en
 * la pantalla, bordado y reflejante como texto, "Vence" y renglones sin color.
 */

const fileName = (descriptor: DocumentPdfDescriptor) =>
  documentPdfFileName(descriptor.type, descriptor.folio, descriptor.id);

const CLIENTE = { id: 10, nombre: "JESUS IBARRA", razon_social: "MDDVVM CASSETTE", rfc: "IAMJ951203BC6" };
const COMPANY = { name: "LAZZAR MEXICO", rfc: null };

/** Elementos del documento y lectores de sus tarjetas y tablas. */
function read(root: unknown) {
  const elements = elementsOf(root);
  const layout = elements.find((element) => element.type === DocumentPdfLayout) as TreeElement;
  const card = (title: string) =>
    Object.fromEntries(pdfCardItems(elements, title).map((item) => [item.label, item.value]));
  const cardTitles = elements
    .filter((element) => element.type === PdfInfoCard)
    .map((element) => element.props.title);
  const tables = elements
    .filter((element) => element.type === PdfLineItemsTable)
    .map((element) => {
      const { title, rows, columns } = element.props as {
        title: string;
        rows: unknown[];
        columns: PdfColumn<unknown>[];
      };
      const visible = visiblePdfColumns(columns, rows);
      return {
        title,
        headers: visible.map((column) => column.header),
        cells: rows.map((row, index) =>
          Object.fromEntries(visible.map((column) => [column.header, column.cell(row, index)])),
        ),
      };
    });
  return { layout: layout.props, card, cardTitles, tables };
}

// ── Orden de bordado ──────────────────────────────────────────────────────────

const obLinea = (overrides: Partial<EmbroideryOrderDetailLine> = {}): EmbroideryOrderDetailLine =>
  ({
    id: 572,
    ob: 177,
    pedido_detalle: 735,
    producto: 8523,
    producto_nombre: "ROMPEVIENTOS",
    talla: 2,
    talla_nombre: "CH",
    color: 93,
    color_nombre: "NEGRO",
    cantidad: 10,
    posicion_bordado: "A",
    colores_hilo: 0,
    puntadas: 0,
    cantidad_pedido: 10,
    cantidad_asignada: 10,
    cantidad_pendiente: 0,
    sku: "3011800CH",
    ubicaciones: [{ codigo: "VIVO", descripcion_posicion: "Lectura en vivo" }],
    configuracion: {
      ubicaciones: [
        {
          codigo: "A",
          descripcion_posicion: "Pecho izquierdo",
          imagen: "https://example.test/a.png",
          ancho_cm: 9,
          alto_cm: 4.1,
          color_hilo: "1170",
          pantones: "",
          dtf: false,
          sublimado: true,
        },
      ],
    },
    tipos_servicio: [],
    tipos_servicio_display: [],
    ...overrides,
  }) as EmbroideryOrderDetailLine;

const ob = (overrides: Partial<EmbroideryOrderDetail> = {}): EmbroideryOrderDetail =>
  ({
    id: 177,
    folio_bordado: "2026-OB-00032",
    estatus_bordado: 1,
    estatus_bordado_display: "Sin trabajar",
    prioridad: 1,
    fecha_inicio: "2026-10-29T10:49:20.457900-06:00",
    fecha_fin: null,
    observaciones: null,
    activo: true,
    empresa: 1,
    sucursal: 1,
    pedido: 356,
    pedido_folio: "P-00127-2026",
    usuario_asignado: 24,
    empresa_nombre: "LAZZAR",
    sucursal_nombre: "Toneles",
    usuario_nombre: "Operador",
    proveedor: null,
    proveedor_nombre: null,
    proveedor_display: null,
    cobertura_completa: false,
    cantidad_cubierta: 10,
    cantidad_contratada: 33,
    maquina_asignada: null,
    avances: [],
    otras_ordenes_del_pedido: [{ id: 178, folio_bordado: "2026-OB-00033", fecha_inicio: "2026-10-30T10:00:00-06:00" }],
    pedido_vinculado: { id: 356, folio: "P-00127-2026", cliente: CLIENTE },
    reparto_por_talla_aproximado: false,
    detalles: [obLinea(), obLinea({ id: 573, talla_nombre: "M", cantidad: 5, sku: "3011800M" })],
    ...overrides,
  }) as EmbroideryOrderDetail;

test.describe("PDF de la orden de bordado", () => {
  test("código OB; solo el 8 (Cancelado legacy) lleva la marca", () => {
    expect(fileName(embroideryOrderPdfDescriptor(ob()))).toBe("OB-2026-OB-00032.pdf");
    expect(fileName(embroideryOrderPdfDescriptor(ob({ folio_bordado: "" })))).toBe("OB-ID177.pdf");
    expect(embroideryOrderPdfDescriptor(ob({ estatus_bordado: 8 })).cancelled).toBe(true);
    expect(embroideryOrderPdfDescriptor(ob({ estatus_bordado: 7 })).cancelled).toBe(false);
  });

  test("el bordado sale como texto de la foto congelada, sin imagen", () => {
    expect(embroideryLineBordadoText(obLinea())).toEqual([
      ["A · Pecho izquierdo", "Medidas: 9 × 4.1 cm", "Color de hilo: 1170", "Técnicas: Sublimado"],
    ]);
    // Sin foto congelada, la lectura en vivo; sin ubicaciones, la posición.
    expect(embroideryLineBordadoText(obLinea({ configuracion: null }))).toEqual([["VIVO · Lectura en vivo"]]);
    expect(embroideryLineBordadoText(obLinea({ configuracion: null, ubicaciones: [] }))).toEqual([["Posición: A"]]);
    // Medidas en cero no son medidas.
    expect(embroideryUbicacionText({ codigo: "B", ancho_cm: 0, alto_cm: 3 })).toEqual(["B"]);
  });

  test("cliente, cobertura y prendas agrupadas por prenda + color", () => {
    const doc = read(EmbroideryOrderPdfDocument({ order: ob(), company: COMPANY }));
    expect(doc.layout.subtitle).toBe("MDDVVM CASSETTE");
    expect(doc.card("CLIENTE")).toEqual({
      Cliente: "JESUS IBARRA",
      "Razón social": "MDDVVM CASSETTE",
      RFC: "IAMJ951203BC6",
    });
    expect(doc.card("COBERTURA DEL PEDIDO")).toMatchObject({
      "Piezas en esta orden": "10",
      "Piezas contratadas": "33",
      Cobertura: "30%",
      Estado: "Parcial",
      "Otras órdenes del pedido": "2026-OB-00033",
    });
    expect(doc.card("ORIGEN Y SEGUIMIENTO").Proveedor).toBe("Bordado interno");
    expect(doc.tables.map((table) => table.title)).toEqual(["ROMPEVIENTOS · NEGRO · 15 piezas"]);
    expect(doc.tables[0].headers).toEqual([
      "Talla",
      "SKU",
      "Bordado",
      "En esta orden",
      "Programado",
      "Pedido",
      "Pendiente",
    ]);
    // Nada de la imagen llega al documento.
    expect(JSON.stringify(doc.tables)).not.toContain("example.test");
  });

  test("sin la clave cliente no hay tarjeta de cliente", () => {
    const doc = read(
      EmbroideryOrderPdfDocument({
        order: ob({ pedido_vinculado: { id: 356, folio: "P-00127-2026" } }),
        company: COMPANY,
      }),
    );
    expect(doc.cardTitles).not.toContain("CLIENTE");
    expect(doc.layout.subtitle).toBeNull();
  });
});

// ── Orden de reflejante ───────────────────────────────────────────────────────

const orLinea = (overrides: Partial<ReflectiveOrderDetailLine> = {}): ReflectiveOrderDetailLine => ({
  id: 60,
  orden_r: 18,
  pedido_detalle: 533,
  producto: 8515,
  producto_nombre: "CHAMARRA ALASKA",
  talla: 3,
  talla_nombre: "M",
  color: 93,
  color_nombre: "NEGRO",
  cantidad: 1,
  tipo_reflejante: "ignifuga-plata-1",
  posicion: "HOMBROS",
  metros: 0,
  sku: "3003800M",
  cantidad_pedido: 10,
  cantidad_asignada: 1,
  cantidad_pendiente: 9,
  configuracion: [{ tipo: "ignifuga-plata-1", opcion: "catalogo", posicion: "HOMBROS" }],
  reflejante_config: [{ tipo: "otro", opcion: null, posicion: null }],
  ...overrides,
});

const or = (overrides: Partial<ReflectiveOrderDetail> = {}): ReflectiveOrderDetail =>
  ({
    id: 3,
    folio_reflejante: "2026-OR-00001",
    fecha_pedido: "2026-08-04",
    fecha_vence: null,
    estatus_reflejante: 1,
    estatus_reflejante_display: "Pendiente",
    prioridad: 1,
    fecha_inicio: "2026-08-04T15:47:59.998058-06:00",
    fecha_fin: null,
    observaciones: null,
    activo: true,
    empresa: 1,
    sucursal: 1,
    pedido: 109,
    pedido_folio: "P-00020-2026",
    usuario_asignado: 4,
    empresa_nombre: "LAZZAR",
    sucursal_nombre: "Toneles",
    usuario_nombre: "Operador",
    cobertura_completa: true,
    cantidad_cubierta: 51,
    cantidad_contratada: 51,
    otras_ordenes_del_pedido: [],
    reparto_por_talla_aproximado: false,
    pedido_vinculado: { id: 109, folio: "P-00020-2026", cliente: { id: 15, nombre: "Luis Ceja", razon_social: "Luigi's", rfc: null } },
    avances: [],
    detalles: [orLinea()],
    ...overrides,
  }) as ReflectiveOrderDetail;

test.describe("PDF de la orden de reflejante", () => {
  test("código OR; la cancelada (7) lleva la marca", () => {
    expect(fileName(reflectiveOrderPdfDescriptor(or()))).toBe("OR-2026-OR-00001.pdf");
    expect(reflectiveOrderPdfDescriptor(or({ estatus_reflejante: 7 })).cancelled).toBe(true);
    expect(reflectiveOrderPdfDescriptor(or({ estatus_reflejante: 5 })).cancelled).toBe(false);
  });

  test("fecha_vence en null sale con guion; la fecha del pedido sí se imprime", () => {
    const datos = read(ReflectiveOrderPdfDocument({ order: or(), company: COMPANY })).card("DATOS DE LA ORDEN");
    expect(datos.Vence).toBe("—");
    expect(datos["Fecha del pedido"]).toBe("04 ago 2026");
  });

  test("metros como en la pantalla: 0 es guion", () => {
    expect(reflectiveMetrosText(0)).toBe("—");
    expect(reflectiveMetrosText(Number.NaN)).toBe("—");
    expect(reflectiveMetrosText(2.5)).toBe("2.5 m");
  });

  test("un renglón sin la clave color_nombre no rompe la tabla: va a Sin color", () => {
    // Como llega del backend: sin la clave, no con `null`.
    const sinColor = orLinea({ id: 2, producto: 8274, producto_nombre: "GORRA", color: null });
    delete sinColor.color_nombre;
    expect("color_nombre" in sinColor).toBe(false);
    const doc = read(
      ReflectiveOrderPdfDocument({ order: or({ detalles: [orLinea(), sinColor] }), company: COMPANY }),
    );
    expect(doc.tables.map((table) => table.title)).toEqual([
      "CHAMARRA ALASKA · NEGRO · 1 pieza",
      "GORRA · Sin color · 1 pieza",
    ]);
    expect(doc.tables[1].headers).toEqual([
      "Talla",
      "SKU",
      "Reflejante",
      "Tipo",
      "Posición",
      "Metros",
      "En esta orden",
      "Programado",
      "Pedido",
      "Pendiente",
    ]);
    expect(doc.tables[1].cells[0]).toMatchObject({ Talla: "M", Metros: "—", "En esta orden": "1" });
  });

  test("cliente del pedido en la tarjeta y en el subtítulo", () => {
    const doc = read(ReflectiveOrderPdfDocument({ order: or(), company: COMPANY }));
    expect(doc.card("CLIENTE")).toEqual({ Cliente: "Luis Ceja", "Razón social": "Luigi's", RFC: "—" });
    expect(doc.layout.subtitle).toBe("Luigi's");
  });
});

// ── Orden de corte de manga ───────────────────────────────────────────────────

const ocm = (overrides: Partial<CorteMangaOrder> = {}): CorteMangaOrder => ({
  id: 10,
  folio_ocm: "2026-CM-00006",
  fecha_pedido: "2026-10-21",
  fecha_vence: "2026-11-24",
  estatus_corte: 1,
  estatus_corte_display: "Pendiente",
  prioridad: 1,
  fecha_inicio: "2026-10-21T14:49:18.426135-06:00",
  fecha_fin: null,
  observaciones: "QA",
  activo: true,
  empresa: 1,
  empresa_nombre: "LAZZAR",
  sucursal: 1,
  sucursal_nombre: "Toneles",
  pedido: 298,
  pedido_folio: "P-00084-2026",
  usuario_asignado: 1,
  usuario_nombre: "Operador",
  cantidad_cubierta: 2,
  cantidad_contratada: 2,
  cobertura_completa: true,
  otras_ordenes_del_pedido: [],
  pedido_vinculado: { id: 298, folio: "P-00084-2026", cliente: CLIENTE },
  detalles: [
    {
      id: 72,
      ocm: 10,
      pedido_detalle: 666,
      producto: 8318,
      producto_nombre: "PANTALON CARGO",
      talla: 18,
      talla_nombre: "32",
      color: 76,
      color_nombre: "MARINO",
      cantidad: 2,
      sku: "201970332",
      cantidad_pedido: 2,
      cantidad_asignada: 2,
      cantidad_pendiente: 0,
      configuracion: { tipo: "1" },
    },
  ],
  ...overrides,
});

test.describe("PDF de la orden de corte de manga", () => {
  test("código OCM; el folio de la serie CM lleva el código delante", () => {
    expect(fileName(corteMangaOrderPdfDescriptor(ocm()))).toBe("OCM-2026-CM-00006.pdf");
    expect(corteMangaOrderPdfDescriptor(ocm({ estatus_corte: 7 })).cancelled).toBe(true);
  });

  test("Vence sale del fecha_vence del detalle, con el cliente y las prendas", () => {
    const doc = read(CorteMangaOrderPdfDocument({ order: ocm(), company: COMPANY }));
    expect(doc.card("DATOS DE LA ORDEN")).toMatchObject({ Vence: "24 nov 2026", "Fecha del pedido": "21 oct 2026" });
    expect(doc.card("ORIGEN Y SEGUIMIENTO")["Total piezas"]).toBe("2");
    expect(doc.card("CLIENTE").RFC).toBe("IAMJ951203BC6");
    expect(doc.tables.map((table) => table.title)).toEqual(["PANTALON CARGO · MARINO · 2 piezas"]);
  });

  test("sin las claves de fecha ni de cobertura (respuesta anterior) se omiten", () => {
    const doc = read(
      CorteMangaOrderPdfDocument({
        order: ocm({
          fecha_pedido: undefined,
          fecha_vence: undefined,
          cantidad_cubierta: undefined,
          cantidad_contratada: undefined,
          cobertura_completa: undefined,
        }),
        company: COMPANY,
      }),
    );
    expect(Object.keys(doc.card("DATOS DE LA ORDEN"))).toEqual(["Estatus", "Prioridad", "Alta", "Fin"]);
    expect(doc.cardTitles).not.toContain("COBERTURA DEL PEDIDO");
    // Sin cantidad_cubierta, el total es la suma de los renglones, como en la página.
    expect(doc.card("ORIGEN Y SEGUIMIENTO")["Total piezas"]).toBe("2");
  });
});
