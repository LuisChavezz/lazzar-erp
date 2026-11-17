import { expect, test } from "@playwright/test";
import { isOfferedForPedidos, type OpSkuOption } from "@/src/features/production-orders/utils/opSkuOptions";

const muestra = (pedidoId: number | null): OpSkuOption => ({
  key: `p:${pedidoId}`,
  kind: "produccion",
  id: 1,
  nombre: "Muestra",
  sku: "MP1",
  pedidoFolio: null,
  pedidoId,
  tieneBom: true,
});

const catalogo: OpSkuOption = {
  key: "c:1",
  kind: "catalogo",
  id: 1,
  nombre: "Camisa",
  sku: "CAM-1",
  tieneBom: true,
};

test.describe("isOfferedForPedidos (EC-898)", () => {
  test("con pedidos vinculados solo ofrece las muestras de esos pedidos", () => {
    expect(isOfferedForPedidos(muestra(2122), [2122])).toBe(true);
    expect(isOfferedForPedidos(muestra(2125), [2122])).toBe(false);
    expect(isOfferedForPedidos(muestra(2125), [2122, 2125])).toBe(true);
    expect(isOfferedForPedidos(muestra(null), [2122])).toBe(false);
  });

  test("sin pedido vinculado ofrece todas las muestras", () => {
    expect(isOfferedForPedidos(muestra(2125), [])).toBe(true);
    expect(isOfferedForPedidos(muestra(null), [])).toBe(true);
  });

  test("las variantes de catálogo siempre se ofrecen", () => {
    expect(isOfferedForPedidos(catalogo, [2122])).toBe(true);
    expect(isOfferedForPedidos(catalogo, [])).toBe(true);
  });
});
