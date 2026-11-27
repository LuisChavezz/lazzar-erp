import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import { AxiosError, type AxiosResponse } from "axios";
import type {
  SupplierReturn,
  SupplierReturnLine,
} from "@/src/features/supplier-returns/interfaces/supplier-return.interface";
import { supplierReturnDetailQueryKey } from "@/src/features/supplier-returns/constants/supplierReturns";
import { supplierReturnPdfDescriptor } from "@/src/features/supplier-returns/utils/supplierReturnPdf";
import { supplierReturnPdfSource } from "@/src/features/supplier-returns/utils/supplierReturnPdfSource";
import { SupplierReturnPdfDocument, totalCantidadDevuelta } from "@/src/pdfs/SupplierReturnPdfDocument";
import { PdfTotals } from "@/src/pdfs/shared/DocumentPdfLayout";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import type { PdfTotalRow } from "@/src/pdfs/shared/documentPdfModel";
import { elementsOf, pdfCardItems, pdfTable } from "./support/pdfElementTree";

/**
 * PDF de la devolución a proveedor (EC-976): identidad y nombre del archivo,
 * marca de cancelada, almacén vacío, renglones sin variante, importes en MXN
 * (costo unitario con hasta 4 decimales) y que la descarga no toque la consulta del diálogo. Corren con
 * `npm run test:unit`, sin red.
 */

const linea = (overrides: Partial<SupplierReturnLine> = {}): SupplierReturnLine => ({
  id: 1,
  calidad_detalle: 10,
  recepcion_detalle: 20,
  producto: 7,
  producto_nombre: "CAMISA",
  producto_variante: 70,
  producto_variante_sku: "10012-100-CH",
  producto_variante_talla: "CH",
  producto_variante_color: "AZUL",
  variante_produccion: null,
  cantidad: "3.0000",
  costo_unitario: "125.50000000",
  importe: "376.50",
  ...overrides,
});

const supplierReturn = (overrides: Partial<SupplierReturn> = {}): SupplierReturn => ({
  id: 9,
  folio: "DVP-261126105500123456",
  estatus: "aplicada",
  calidad_inspeccion: 4,
  recepcion: 5,
  recepcion_folio: "RC-000123",
  orden_compra: 3,
  orden_compra_folio: "OC-00010-2026",
  proveedor: 2,
  proveedor_nombre: "Proveedor SA",
  sucursal_nombre: "Toneles",
  almacen: 1,
  almacen_nombre: "PRODUCTO TERMINADO",
  motivo: "Costura abierta",
  fecha: "2026-11-26T10:55:00-06:00",
  usuario: 1,
  usuario_nombre: "Ana López",
  total: "1376.50",
  movimiento_inventario: 44,
  motivo_cancelacion: "",
  fecha_cancelacion: null,
  cancelado_por: null,
  cancelado_por_nombre: null,
  detalles: [linea()],
  ...overrides,
});

const fileNameOf = (dev: SupplierReturn) => {
  const descriptor = supplierReturnPdfDescriptor(dev);
  return documentPdfFileName(descriptor.type, descriptor.folio, descriptor.id);
};

function documentOf(detail: SupplierReturn) {
  const root = SupplierReturnPdfDocument({ supplierReturn: detail, company: { name: "LAZZAR MEXICO", rfc: null } });
  const elements = elementsOf(root);
  const cardOf = (title: string) =>
    Object.fromEntries(pdfCardItems(elements, title).map((item) => [item.label, item.value]));
  const table = pdfTable<SupplierReturnLine>(elements, "RENGLONES DEVUELTOS");
  const cellText = (header: string, row: number) =>
    table.columns.find((column) => column.header === header)?.cell(table.rows[row], row);
  const totalsElement = elements.find((element) => element.type === PdfTotals);
  const totals = Object.fromEntries(
    ((totalsElement?.props.rows ?? []) as PdfTotalRow[]).map((row) => [row.label, row.value]),
  );
  return {
    root: root as { props: { descriptor: ReturnType<typeof supplierReturnPdfDescriptor> } },
    datos: cardOf("DATOS DE LA DEVOLUCIÓN"),
    almacen: cardOf("PROVEEDOR Y ALMACÉN"),
    headers: table.columns.map((column) => column.header),
    cellText,
    totals,
  };
}

test.describe("supplierReturnPdfDescriptor", () => {
  test("código DVP; el folio con segmento DVP no repite el prefijo", () => {
    expect(supplierReturnPdfDescriptor(supplierReturn())).toEqual({
      type: "DVP",
      id: 9,
      folio: "DVP-261126105500123456",
      cancelled: false,
    });
    expect(fileNameOf(supplierReturn())).toBe("DVP-261126105500123456.pdf");
    // Serie de la sucursal con otro prefijo, y sin folio.
    expect(fileNameOf(supplierReturn({ folio: "DEV-00001" }))).toBe("DVP-DEV-00001.pdf");
    expect(fileNameOf(supplierReturn({ folio: null }))).toBe("DVP-ID9.pdf");
  });

  test("cancelada: marca con motivo, quién y cuándo", () => {
    const descriptor = supplierReturnPdfDescriptor(
      supplierReturn({
        estatus: "cancelada",
        motivo_cancelacion: "Captura duplicada",
        fecha_cancelacion: "2026-11-26T14:05:00-06:00",
        cancelado_por: 1,
        cancelado_por_nombre: "Ana López",
      }),
    );
    expect(descriptor.cancelled).toBe(true);
    expect(descriptor.cancellationReason).toBe("Captura duplicada");
    expect(descriptor.cancellationDetail).toMatch(/^Canceló: Ana López · Fecha: 26 nov 2026/);
    // Aplicada: aunque llegara un motivo, no hay marca.
    expect(supplierReturnPdfDescriptor(supplierReturn({ motivo_cancelacion: "x" })).cancellationReason).toBeUndefined();
  });
});

test.describe("SupplierReturnPdfDocument", () => {
  test("encabezado: recepción, OC, proveedor, almacén y sucursal", () => {
    const doc = documentOf(supplierReturn());
    expect(doc.datos).toMatchObject({
      Estatus: "Aplicada",
      Recepción: "RC-000123",
      "Orden de compra": "OC-00010-2026",
      Registró: "Ana López",
      Moneda: "MXN",
    });
    expect(doc.almacen).toEqual({ Proveedor: "Proveedor SA", Almacén: "PRODUCTO TERMINADO", Sucursal: "Toneles" });
  });

  test("almacen_nombre vacío sale con guion", () => {
    expect(documentOf(supplierReturn({ almacen_nombre: "" })).almacen.Almacén).toBe("—");
  });

  test("cancelada: el marco recibe la marca", () => {
    const doc = documentOf(supplierReturn({ estatus: "cancelada", motivo_cancelacion: "Error" }));
    expect(doc.root.props.descriptor.cancelled).toBe(true);
    expect(doc.datos.Estatus).toBe("Cancelada");
  });

  test("SKU, color y talla por renglón; null → guion; sin dato en ningún renglón no hay columna", () => {
    const doc = documentOf(
      supplierReturn({
        detalles: [
          linea(),
          linea({ id: 2, producto_variante_sku: null, producto_variante_talla: null, producto_variante_color: null }),
        ],
      }),
    );
    expect(doc.headers).toEqual(["SKU", "Producto", "Color", "Talla", "Cantidad", "Costo unitario", "Importe"]);
    expect([doc.cellText("SKU", 0), doc.cellText("Color", 0), doc.cellText("Talla", 0)]).toEqual([
      "10012-100-CH",
      "AZUL",
      "CH",
    ]);
    expect([doc.cellText("SKU", 1), doc.cellText("Color", 1), doc.cellText("Talla", 1)]).toEqual(["—", "—", "—"]);

    const materiaPrima = documentOf(
      supplierReturn({
        detalles: [
          linea({ producto_variante: null, producto_variante_sku: null, producto_variante_talla: null, producto_variante_color: null }),
        ],
      }),
    );
    expect(materiaPrima.headers).toEqual(["Producto", "Cantidad", "Costo unitario", "Importe"]);
  });

  test("importes en MXN y el total es el de la respuesta", () => {
    const doc = documentOf(
      supplierReturn({ detalles: [linea(), linea({ id: 2, cantidad: "1.5000", importe: "1000.00" })] }),
    );
    expect(doc.cellText("Costo unitario", 0)).toBe("$125.50");
    expect(doc.cellText("Importe", 0)).toBe("$376.50");
    expect(doc.cellText("Cantidad", 1)).toBe("1.5");
    // Total de la respuesta, no Σ importes recalculada; etiqueta neutra (materia prima fraccionaria).
    expect(doc.totals).toEqual({ Renglones: "2", "Cantidad devuelta": "4.5", Total: "$1,376.50" });
  });

  test("costo unitario con hasta 4 decimales: 0.0040 no sale como 0.00", () => {
    const doc = documentOf(
      supplierReturn({
        detalles: [
          linea({ cantidad: "1000.0000", costo_unitario: "0.00400000", importe: "4.00" }),
          linea({ id: 2, costo_unitario: "294.83456789" }),
        ],
      }),
    );
    expect(doc.cellText("Costo unitario", 0)).toBe("$0.004");
    expect(doc.cellText("Costo unitario", 1)).toBe("$294.8346");
    expect(doc.cellText("Importe", 0)).toBe("$4.00");
  });

  test("Σ cantidades sin residuos de punto flotante ni notación exponencial", () => {
    expect(totalCantidadDevuelta([{ cantidad: "0.1000" }, { cantidad: "0.2000" }, { cantidad: "abc" }])).toBe("0.3000");
    expect(totalCantidadDevuelta([{ cantidad: "1e21" }])).not.toMatch(/e/);
  });
});

// ── Fuente: la descarga no toca la consulta del diálogo ───────────────────────

const notFound = () =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 404,
    statusText: "",
    headers: {},
    config: {} as AxiosResponse["config"],
    data: { detail: "No encontrado." },
  } as AxiosResponse);

const DIALOG_KEY = supplierReturnDetailQueryKey(9);

async function download(respond: () => Promise<SupplierReturn>) {
  const { v1_api } = await import("@/src/api/v1.api");
  const originalGet = v1_api.get;
  const urls: string[] = [];
  v1_api.get = (async (url: string) => {
    urls.push(url);
    return { data: await respond() };
  }) as typeof v1_api.get;
  const client = new QueryClient();
  const cached = supplierReturn({ folio: "DVP-VIEJO" });
  client.setQueryData(DIALOG_KEY, cached);
  const rendered: SupplierReturn[] = [];
  const source = supplierReturnPdfSource({
    returnId: 9,
    render: async (detail) => {
      rendered.push(detail);
      return new Blob(["%PDF-fake"], { type: "application/pdf" });
    },
  });
  let outcome: { descriptor: ReturnType<typeof supplierReturnPdfDescriptor> } | { error: unknown };
  try {
    const file = await source({ company: { name: "LAZZAR MEXICO", rfc: null } });
    outcome = { descriptor: file.descriptor };
  } catch (error) {
    outcome = { error };
  } finally {
    v1_api.get = originalGet;
  }
  return { outcome, urls, rendered, client, cached };
}

test.describe("supplierReturnPdfSource", () => {
  test("lee la devolución fresca: el estatus del PDF es el del servidor, no el del diálogo", async () => {
    const { outcome, urls, rendered, client, cached } = await download(async () =>
      supplierReturn({ estatus: "cancelada", motivo_cancelacion: "Error" }),
    );
    expect(urls).toEqual(["/compras/devoluciones-proveedor/9/"]);
    expect(rendered[0].estatus).toBe("cancelada");
    expect("descriptor" in outcome && outcome.descriptor.cancelled).toBe(true);
    expect(client.getQueryData(DIALOG_KEY)).toBe(cached);
  });

  test("un fallo no genera el PDF ni cambia la consulta del diálogo a error", async () => {
    const { outcome, rendered, client } = await download(async () => {
      throw notFound();
    });
    expect("error" in outcome).toBe(true);
    expect(rendered).toHaveLength(0);
    const state = client.getQueryState(DIALOG_KEY);
    expect(state?.status).toBe("success");
    expect(state?.error).toBeNull();
  });
});
