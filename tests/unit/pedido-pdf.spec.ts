import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import { AxiosError, type AxiosResponse } from "axios";
import type { Currency } from "@/src/features/currency/interfaces/currency.interface";
import type { PedidoDetail } from "@/src/features/orders/interfaces/order.interface";
import { pedidoDetailQueryKey } from "@/src/features/orders/hooks/usePedidoDetail";
import { canSeeAccounting } from "@/src/features/orders/utils/orderAccounting";
import {
  loadPedidoForPdf,
  PEDIDO_PDF_CURRENCY_ERROR,
  type PedidoPdfData,
} from "@/src/features/orders/utils/loadPedidoForPdf";
import { pedidoPdfDescriptor } from "@/src/features/orders/utils/pedidoPdfDescriptor";
import { ivaTotalRow, PedidoPdfDocument } from "@/src/pdfs/PedidoPdfDocument";
import { PdfTotals } from "@/src/pdfs/shared/DocumentPdfLayout";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { visiblePdfTotals, type PdfTotalRow } from "@/src/pdfs/shared/documentPdfModel";
import { elementsOf, pdfTable } from "./support/pdfElementTree";

/**
 * PDF del pedido (EC-856): identidad del documento, nombre del archivo, carga
 * del detalle + moneda y qué columnas y totales se pintan con y sin importes.
 * Corren con `npm run test:unit`, sin red: `v1_api.get` se sustituye por uno
 * falso y el documento se recorre como árbol de elementos, sin renderizarlo.
 */

test.describe("pedidoPdfDescriptor", () => {
  test("usa el código PED y solo el CANCELADO (5) lleva la marca, sin motivo", () => {
    expect(pedidoPdfDescriptor({ id: 9, folio: "P-000123", estatus: 3 })).toEqual({
      type: "PED",
      id: 9,
      folio: "P-000123",
      cancelled: false,
    });
    const cancelado = pedidoPdfDescriptor({ id: 9, folio: "P-000123", estatus: 5 });
    expect(cancelado.cancelled).toBe(true);
    expect(cancelado.cancellationReason).toBeUndefined();
  });

  test("el archivo se llama PED-<folio>.pdf, o PED-ID<id>.pdf sin folio", () => {
    const fileName = (folio: string | null) => {
      const descriptor = pedidoPdfDescriptor({ id: 42, folio, estatus: 1 });
      return documentPdfFileName(descriptor.type, descriptor.folio, descriptor.id);
    };
    expect(fileName("P-000123")).toBe("PED-P-000123.pdf");
    expect(fileName("PED-000123-26")).toBe("PED-000123-26.pdf");
    expect(fileName(null)).toBe("PED-ID42.pdf");
  });
});

const pedidoBase = { id: 42, folio: "P-000123", estatus: 3, moneda: 2 } as PedidoDetail;
const currencies = [
  { id: 1, codigo_iso: "MXN", nombre: "Peso mexicano" },
  { id: 2, codigo_iso: "USD", nombre: "Dólar estadounidense" },
] as Currency[];

const notFound = () =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 404,
    statusText: "",
    headers: {},
    config: {} as AxiosResponse["config"],
    data: { detail: "No encontrado." },
  } as AxiosResponse);

type LoadOutcome = { data: PedidoPdfData } | { error: unknown };

/**
 * Corre `loadPedidoForPdf` con `v1_api.get` sustituido: el detalle responde lo
 * que diga `detail` y el catálogo de monedas (`/nucleo/monedas/`) lo que diga
 * `catalog`. `cached` siembra en la caché el detalle que observa la página,
 * para comprobar que la descarga no lo toca. El `get` falso se mantiene hasta
 * que el catálogo termina (también cuando nadie lo espera), así ningún
 * reintento sale a la red. Devuelve el resultado ya resuelto: ninguna promesa
 * rechazada queda sin atender.
 */
async function load(
  detail: () => Promise<PedidoDetail>,
  catalog: () => Promise<Currency[]>,
  cached?: PedidoDetail,
) {
  const { v1_api } = await import("@/src/api/v1.api");
  const originalGet = v1_api.get;
  const urls: string[] = [];
  v1_api.get = (async (url: string) => {
    urls.push(url);
    return { data: url === "/nucleo/monedas/" ? await catalog() : await detail() };
  }) as typeof v1_api.get;
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  if (cached) client.setQueryData(pedidoDetailQueryKey(cached.id), cached);
  let outcome: LoadOutcome;
  try {
    outcome = { data: await loadPedidoForPdf(client, 42) };
  } catch (error) {
    outcome = { error };
  }
  try {
    while (client.isFetching() > 0) await new Promise((resolve) => setTimeout(resolve, 5));
  } finally {
    v1_api.get = originalGet;
  }
  return { outcome, urls, client };
}

const dataOf = (outcome: LoadOutcome): PedidoPdfData => {
  if ("error" in outcome) throw outcome.error;
  return outcome.data;
};

const failingCatalog = async (): Promise<Currency[]> => {
  throw new Error("Network Error");
};

test.describe("loadPedidoForPdf", () => {
  test("lee el detalle del backend sin escribir en la caché que observa la página", async () => {
    const stale = { ...pedidoBase, folio: null, estatus: 1 } as PedidoDetail;
    const { outcome, urls, client } = await load(async () => pedidoBase, async () => currencies, stale);
    expect(dataOf(outcome).pedido.folio).toBe("P-000123");
    expect(urls).toContain("/ventas/pedidos/42/");
    expect(client.getQueryData(pedidoDetailQueryKey(42))).toBe(stale);
  });

  test("un 404 al descargar no cambia la consulta de la página a error", async () => {
    const { outcome, client } = await load(
      async () => {
        throw notFound();
      },
      async () => currencies,
      pedidoBase,
    );
    expect("error" in outcome).toBe(true);
    const state = client.getQueryState(pedidoDetailQueryKey(42));
    expect(state?.status).toBe("success");
    expect(state?.error).toBeNull();
  });

  test("sin importes la moneda es null y un catálogo caído no aborta el PDF", async () => {
    const { outcome } = await load(async () => pedidoBase, failingCatalog);
    expect(dataOf(outcome).currency).toBeNull();
  });

  test("con importes resuelve la moneda del pedido por su id", async () => {
    const pedido = { ...pedidoBase, gran_total: "116.00" } as PedidoDetail;
    const { outcome } = await load(async () => pedido, async () => currencies);
    expect(dataOf(outcome).currency).toEqual({ codigo: "USD", label: "USD - Dólar estadounidense" });
  });

  test("una moneda que el catálogo no trae sale sin símbolo, nunca como MXN", async () => {
    const pedido = { ...pedidoBase, moneda: 99, subtotal: "100.00" } as PedidoDetail;
    const { outcome } = await load(async () => pedido, async () => currencies);
    expect(dataOf(outcome).currency).toEqual({ codigo: null, label: null });
  });

  test("si el catálogo falla con importes visibles, el PDF se aborta con un mensaje propio", async () => {
    const pedido = { ...pedidoBase, gran_total: "116.00" } as PedidoDetail;
    const { outcome } = await load(async () => pedido, failingCatalog);
    expect(() => dataOf(outcome)).toThrow(PEDIDO_PDF_CURRENCY_ERROR);
  });
});

// ── Documento: lo que se pinta con y sin importes ────────────────────────────

const talla = (precio: string | undefined) => ({
  id: 1,
  talla: 1,
  talla_nombre: "M",
  cantidad: 2,
  lleva_bordado: false,
  lleva_reflejante: false,
  lleva_corte_manga: false,
  lleva_cambio_talla: false,
  ...(precio === undefined ? {} : { precio_unitario: precio, subtotal_talla: "0.00" }),
});

/** Pedido de una línea y un servicio extra, con o sin las claves contables. */
const pedidoFixture = (withAmounts: boolean) =>
  ({
    id: 42,
    folio: "P-000123",
    estatus: 3,
    tipo_pedido: 1,
    moneda: 1,
    detalles: [
      {
        id: 10,
        producto: 5,
        producto_nombre: "CAMISA",
        sku_base: "100",
        color_nombre: "AZUL",
        cantidad_total: 2,
        tallas: [talla(withAmounts ? "50.00" : undefined)],
        ...(withAmounts ? { precio_unitario: "50.00", subtotal_linea: "0.00" } : {}),
      },
    ],
    servicios_extras: [
      {
        id: 1,
        nombre: "BORDADO",
        cantidad: 1,
        visible_en_factura: true,
        ...(withAmounts ? { monto: "10.00" } : {}),
      },
    ],
    ...(withAmounts
      ? { subtotal: "100.00", iva: 16, importe_iva: "16.00", gran_total: "116.00", forma_pago: "03" }
      : {}),
  }) as unknown as PedidoDetail;

function renderedParts(pedido: PedidoDetail) {
  const tree = PedidoPdfDocument({
    pedido,
    company: { name: "LAZZAR MEXICO", rfc: null },
    currency: canSeeAccounting(pedido) ? { codigo: "MXN", label: "MXN - Peso mexicano" } : null,
  });
  const elements = elementsOf(tree);
  const columnsOf = (title: string) =>
    pdfTable(elements, title).columns.map((column) => column.header);
  const totals = elements.find((element) => element.type === PdfTotals);
  const totalLabels = visiblePdfTotals((totals?.props as { rows: PdfTotalRow[] }).rows).map(
    (row) => row.label,
  );
  return { columnsOf, totalLabels };
}

test.describe("PedidoPdfDocument", () => {
  test("sin las claves contables no hay Precio, Importe, Monto ni totales de dinero", () => {
    const parts = renderedParts(pedidoFixture(false));
    expect(parts.columnsOf("PRODUCTOS")).toEqual(["#", "SKU", "Descripción", "Tallas", "Cantidad"]);
    expect(parts.columnsOf("SERVICIOS EXTRA")).toEqual(["Servicio", "Cantidad"]);
    expect(parts.totalLabels).toEqual(["Piezas totales"]);
  });

  test("con importes aparecen Precio, Importe (si concilia), Monto y los totales", () => {
    const parts = renderedParts(pedidoFixture(true));
    expect(parts.columnsOf("PRODUCTOS")).toEqual([
      "#",
      "SKU",
      "Descripción",
      "Tallas",
      "Cantidad",
      "Precio u.",
      "Importe",
    ]);
    expect(parts.columnsOf("SERVICIOS EXTRA")).toEqual(["Servicio", "Cantidad", "Monto"]);
    expect(parts.totalLabels).toEqual(["Piezas totales", "Subtotal", "Moneda", "IVA (16%)", "TOTAL"]);
  });
});

test.describe("ivaTotalRow", () => {
  test("sin importe de IVA muestra la tasa, como la pantalla", () => {
    expect(ivaTotalRow(16, undefined)).toEqual({ label: "IVA", value: "16%" });
    expect(ivaTotalRow(16, "$16.00")).toEqual({ label: "IVA (16%)", value: "$16.00" });
    expect(ivaTotalRow(undefined, undefined).value).toBeUndefined();
  });
});
