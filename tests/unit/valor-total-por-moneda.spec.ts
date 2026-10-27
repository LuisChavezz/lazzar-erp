import { expect, test } from "@playwright/test";
import { valorTotalPorMoneda } from "@/src/features/orders/utils/valorTotalPorMoneda";
import type { Currency } from "@/src/features/currency/interfaces/currency.interface";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";

/** "Valor total" de la Mesa de Control por moneda (EC-601). */

const moneda = (id: number, codigo_iso: string): Currency => ({
  id,
  codigo_iso,
  nombre: codigo_iso,
  simbolo: "$",
  decimales: 2,
  activo: true,
  created_at: "",
  updated_at: "",
});

const pedido = (monedaId: number, gran_total: string) =>
  ({ moneda: monedaId, gran_total }) as PedidoListItem;

const CATALOGO = [moneda(1, "MXN"), moneda(7, "USD")];

test.describe("valorTotalPorMoneda", () => {
  test("suma por moneda resuelta en el catálogo, ordenada por código", () => {
    expect(
      valorTotalPorMoneda([pedido(7, "10.10"), pedido(1, "100.20"), pedido(1, "0.10")], CATALOGO),
    ).toEqual([
      { moneda: "MXN", total: 100.3 },
      { moneda: "USD", total: 10.1 },
    ]);
  });

  test("sin catálogo (falló la petición) cada PK queda aparte, sin código y etiquetada", () => {
    expect(valorTotalPorMoneda([pedido(7, "5"), pedido(1, "3"), pedido(1, "2")], undefined)).toEqual([
      { moneda: null, total: 5, etiqueta: "Sin moneda (1)" },
      { moneda: null, total: 5, etiqueta: "Sin moneda (7)" },
    ]);
  });

  test("una sola PK sin código no lleva etiqueta propia", () => {
    expect(valorTotalPorMoneda([pedido(1, "3"), pedido(99, "4")], CATALOGO)).toEqual([
      { moneda: "MXN", total: 3 },
      { moneda: null, total: 4 },
    ]);
  });

  test("sin pedidos no hay monedas", () => {
    expect(valorTotalPorMoneda([], CATALOGO)).toEqual([]);
  });
});
