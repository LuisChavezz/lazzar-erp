import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import { AxiosError, type AxiosResponse } from "axios";
import type { ReceiptDetail, ReceiptDetailLine } from "@/src/features/receipts/interfaces/receipt.interface";
import { receiptOrigin, receiptPdfDescriptor } from "@/src/features/receipts/utils/receiptPdf";
import { receiptPdfSource } from "@/src/features/receipts/utils/receiptPdfSource";
import { ReceiptPdfDocument } from "@/src/pdfs/ReceiptPdfDocument";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { elementsOf, pdfCardItems, pdfTable } from "./support/pdfElementTree";

/**
 * PDF de la recepción (EC-856): identidad y nombre del archivo, origen (OC u
 * OP) por `tipo_origen`, talla por renglón y que la descarga no toque la
 * consulta que observa el diálogo. Corren con `npm run test:unit`, sin red:
 * `v1_api.get` se sustituye y el documento se recorre como árbol de elementos.
 */

const linea = (overrides: Partial<ReceiptDetailLine> = {}): ReceiptDetailLine => ({
  id: 1,
  orden_compra_detalle: null,
  producto: 7,
  producto_nombre: "CAMISA",
  producto_variante: 70,
  producto_variante_sku: "1000503CH",
  producto_codigo: null,
  producto_cod_proscai: null,
  producto_variante_talla: "CH",
  ubicacion: null,
  ubicacion_nombre: null,
  lote: null,
  serie: null,
  cantidad_recibida: "12.0000",
  ...overrides,
});

const receipt = (overrides: Partial<ReceiptDetail> = {}): ReceiptDetail => ({
  id: 5,
  tipo_origen: "OC",
  orden_compra_folio: "OC-00010-2026",
  op_folio: null,
  folio: "RC-000123",
  remision: null,
  factura_referencia: null,
  fecha_recepcion: "2026-11-12T10:00:00-06:00",
  estatus: 5,
  estatus_label: "Cerrada",
  sucursal: 1,
  sucursal_nombre: "Toneles",
  proveedor: 3,
  proveedor_nombre: "Proveedor SA",
  almacen: 2,
  almacen_nombre: "Almacén PT",
  transportista: null,
  transportista_nombre: null,
  observaciones: null,
  created_at: "2026-11-12T10:00:00-06:00",
  updated_at: "2026-11-12T10:00:00-06:00",
  detalles: [linea()],
  ...overrides,
});

const fileNameOf = (detail: Pick<ReceiptDetail, "id" | "folio" | "estatus">) => {
  const descriptor = receiptPdfDescriptor(detail);
  return documentPdfFileName(descriptor.type, descriptor.folio, descriptor.id);
};

test.describe("receiptPdfDescriptor", () => {
  test("un solo código RC para OC y OP; el archivo no repite el prefijo ni dice el origen", () => {
    expect(receiptPdfDescriptor(receipt())).toEqual({
      type: "RC",
      id: 5,
      folio: "RC-000123",
      cancelled: false,
    });
    expect(fileNameOf(receipt())).toBe("RC-000123.pdf");
    expect(fileNameOf(receipt({ tipo_origen: "OP", folio: "RT-000009" }))).toBe("RC-RT-000009.pdf");
    expect(fileNameOf(receipt({ folio: "" }))).toBe("RC-ID5.pdf");
  });

  test("solo el estatus 6 (Cancelada) lleva la marca, sin motivo", () => {
    const cancelada = receiptPdfDescriptor(receipt({ estatus: 6 }));
    expect(cancelada.cancelled).toBe(true);
    expect(cancelada.cancellationReason).toBeUndefined();
    expect(receiptPdfDescriptor(receipt({ estatus: 4 })).cancelled).toBe(false);
  });
});

test.describe("receiptOrigin", () => {
  test("toma el folio que corresponde a tipo_origen, no el que venga", () => {
    expect(receiptOrigin(receipt())).toEqual({ label: "Orden de compra", folio: "OC-00010-2026" });
    expect(
      receiptOrigin(receipt({ tipo_origen: "OP", orden_compra_folio: "OC-X", op_folio: "OP-000042" })),
    ).toEqual({ label: "Orden de producción", folio: "OP-000042" });
    expect(receiptOrigin(receipt({ orden_compra_folio: null })).folio).toBeNull();
  });

  test("un tipo_origen que no es OC ni OP se dice Desconocido, sin folio", () => {
    expect(
      receiptOrigin({ tipo_origen: "TR", orden_compra_folio: "OC-X", op_folio: "OP-Y" }),
    ).toEqual({ label: "Desconocido", folio: null });
  });
});

function documentOf(detail: ReceiptDetail) {
  const elements = elementsOf(
    ReceiptPdfDocument({ receipt: detail, company: { name: "LAZZAR MEXICO", rfc: null } }),
  );
  const datos = Object.fromEntries(
    pdfCardItems(elements, "DATOS DE LA RECEPCIÓN").map((item) => [item.label, item.value]),
  );
  const entrega = Object.fromEntries(
    pdfCardItems(elements, "PROVEEDOR Y ENTREGA").map((item) => [item.label, item.value]),
  );
  const table = pdfTable<ReceiptDetailLine>(elements, "PRODUCTOS RECIBIDOS");
  const cellText = (header: string, row: number) => {
    const column = table.columns.find((candidate) => candidate.header === header);
    return column?.cell(table.rows[row], row);
  };
  return { datos, entrega, headers: table.columns.map((column) => column.header), cellText };
}

test.describe("ReceiptPdfDocument", () => {
  test("desde OC: origen con el folio de la OC y el nombre del proveedor", () => {
    const doc = documentOf(receipt());
    expect(doc.datos.Origen).toBe("Orden de compra");
    expect(doc.datos["Folio de origen"]).toBe("OC-00010-2026");
    expect(doc.entrega.Proveedor).toBe("Proveedor SA");
  });

  test("desde OP: origen con el folio de la OP y proveedor vacío", () => {
    const doc = documentOf(
      receipt({ tipo_origen: "OP", orden_compra_folio: null, op_folio: "OP-000042", proveedor_nombre: null }),
    );
    expect(doc.datos.Origen).toBe("Orden de producción");
    expect(doc.datos["Folio de origen"]).toBe("OP-000042");
    expect(doc.entrega.Proveedor).toBe("—");
  });

  test("cada renglón lleva su talla; sin talla no hay columna, y nunca Lote ni Serie", () => {
    const doc = documentOf(
      receipt({ detalles: [linea(), linea({ id: 2, producto_variante_talla: "G", cantidad_recibida: "3.5000" })] }),
    );
    expect(doc.headers).toEqual(["SKU", "Producto", "Talla", "Recibido"]);
    expect(doc.cellText("Talla", 0)).toBe("CH");
    expect(doc.cellText("Talla", 1)).toBe("G");
    expect(doc.cellText("Recibido", 1)).toBe("3.5");

    const materiaPrima = documentOf(
      receipt({
        detalles: [
          linea({ producto_variante: null, producto_variante_sku: null, producto_variante_talla: null, producto_codigo: "MP-1", lote: 12 }),
        ],
      }),
    );
    // Sin columna de talla, y sin Lote/Serie aunque el renglón traiga sus ids:
    // el backend no manda un código legible.
    expect(materiaPrima.headers).toEqual(["SKU", "Producto", "Recibido"]);
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

const DIALOG_KEY = ["receipt-detail", 5];

/** Corre la fuente con `v1_api.get` sustituido y la consulta del diálogo ya cargada. */
async function download(respond: () => Promise<ReceiptDetail>) {
  const { v1_api } = await import("@/src/api/v1.api");
  const originalGet = v1_api.get;
  const urls: string[] = [];
  v1_api.get = (async (url: string) => {
    urls.push(url);
    return { data: await respond() };
  }) as typeof v1_api.get;
  const client = new QueryClient();
  const cached = receipt({ folio: "RC-VIEJO" });
  client.setQueryData(DIALOG_KEY, cached);
  const rendered: ReceiptDetail[] = [];
  const source = receiptPdfSource(5, async (detail) => {
    rendered.push(detail);
    return new Blob(["%PDF-fake"], { type: "application/pdf" });
  });
  let outcome: { fileFolio: string | null | undefined } | { error: unknown };
  try {
    const file = await source({ company: { name: "LAZZAR MEXICO", rfc: null } });
    outcome = { fileFolio: file.descriptor.folio };
  } catch (error) {
    outcome = { error };
  } finally {
    v1_api.get = originalGet;
  }
  return { outcome, urls, rendered, client, cached };
}

test.describe("receiptPdfSource", () => {
  test("lee la recepción fresca del servicio y deja intacta la consulta del diálogo", async () => {
    const { outcome, urls, rendered, client, cached } = await download(async () => receipt());
    expect(outcome).toEqual({ fileFolio: "RC-000123" });
    expect(urls).toEqual(["/compras/recepciones/5/"]);
    expect(rendered[0].folio).toBe("RC-000123");
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
