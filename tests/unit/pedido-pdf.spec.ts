import { expect, test } from "@playwright/test";
import { QueryClient } from "@tanstack/react-query";
import type { Currency } from "@/src/features/currency/interfaces/currency.interface";
import type { PedidoDetail } from "@/src/features/orders/interfaces/order.interface";
import { pedidoDetailQueryKey } from "@/src/features/orders/hooks/usePedidoDetail";
import {
  loadPedidoForPdf,
  PEDIDO_PDF_CURRENCY_ERROR,
} from "@/src/features/orders/utils/loadPedidoForPdf";
import { pedidoPdfDescriptor } from "@/src/features/orders/utils/pedidoPdfDescriptor";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";

/**
 * PDF del pedido (EC-856): identidad del documento, nombre del archivo y carga
 * del detalle + moneda. Corren con `npm run test:unit`, sin red: `v1_api.get`
 * se sustituye por uno falso.
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

/**
 * Corre `loadPedidoForPdf` con `v1_api.get` sustituido: el detalle responde
 * `pedido` y el catálogo de monedas (`/nucleo/monedas/`) lo que diga `catalog`.
 * `cached` siembra un detalle VIEJO en la caché, para comprobar que se relee.
 */
async function load(
  pedido: PedidoDetail,
  catalog: () => Promise<Currency[]>,
  cached?: PedidoDetail,
) {
  const { v1_api } = await import("@/src/api/v1.api");
  const originalGet = v1_api.get;
  const urls: string[] = [];
  v1_api.get = (async (url: string) => {
    urls.push(url);
    return { data: url === "/nucleo/monedas/" ? await catalog() : pedido };
  }) as typeof v1_api.get;
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  if (cached) client.setQueryData(pedidoDetailQueryKey(pedido.id), cached);
  // Se espera DENTRO del try: el catálogo se pide después del detalle, y el
  // `get` original no debe volver antes de esa segunda petición.
  try {
    const data = await loadPedidoForPdf(client, pedido.id);
    return { result: Promise.resolve(data), urls };
  } catch (error) {
    return { result: Promise.reject(error), urls };
  } finally {
    v1_api.get = originalGet;
  }
}

test.describe("loadPedidoForPdf", () => {
  test("relee el detalle aunque esté en caché y, sin importes, no pide monedas", async () => {
    const stale = { ...pedidoBase, folio: null, estatus: 1 } as PedidoDetail;
    const { result, urls } = await load(pedidoBase, async () => currencies, stale);
    const data = await result;
    expect(data.pedido.folio).toBe("P-000123");
    expect(data.currency).toBeNull();
    expect(urls).toEqual(["/ventas/pedidos/42/"]);
  });

  test("con importes resuelve la moneda del pedido por su id", async () => {
    const pedido = { ...pedidoBase, gran_total: "116.00" } as PedidoDetail;
    const { result } = await load(pedido, async () => currencies);
    expect((await result).currency).toEqual({ codigo: "USD", label: "USD - Dólar estadounidense" });
  });

  test("una moneda que el catálogo no trae sale sin símbolo, nunca como MXN", async () => {
    const pedido = { ...pedidoBase, moneda: 99, subtotal: "100.00" } as PedidoDetail;
    const { result } = await load(pedido, async () => currencies);
    expect((await result).currency).toEqual({ codigo: null, label: null });
  });

  test("si el catálogo falla, el PDF se aborta con un mensaje propio", async () => {
    const pedido = { ...pedidoBase, gran_total: "116.00" } as PedidoDetail;
    const { result } = await load(pedido, async () => {
      throw new Error("Network Error");
    });
    await expect(result).rejects.toThrow(PEDIDO_PDF_CURRENCY_ERROR);
  });
});
