import { expect, test } from "@playwright/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  useProductSearch,
  useProductSelectorTotal,
} from "@/src/features/products/hooks/useProductSelector";
import {
  useProductVariantSearch,
  useProductVariantSelectorTotal,
} from "@/src/features/product-variants/hooks/useProductVariantSelector";

/**
 * EC-887 (revisión): los hooks de los selectores de productos y variantes
 * salen de una misma fábrica (`createCatalogSelectorHooks`). Se renderizan en
 * el servidor sobre un `QueryClient` ya poblado en las llaves de siempre: si la
 * fábrica cambiara una llave, el hook no encontraría los datos.
 */

const page = <T,>(results: T[], count = results.length) => ({ count, next: null, previous: null, results });

function run<T>(seed: (client: QueryClient) => void, useHook: () => T): T {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  seed(client);
  let out: T | undefined;
  const Probe = ({ onRender }: { onRender: (value: T) => void }) => {
    onRender(useHook());
    return null;
  };
  renderToString(
    createElement(
      QueryClientProvider,
      { client },
      createElement(Probe, {
        onRender: (value: T) => {
          out = value;
        },
      }),
    ),
  );
  return out as T;
}

test("product search reads [products, selector, {limit, q, tipo_id}]", () => {
  const result = run(
    (client) =>
      client.setQueryData(["products", "selector", { limit: 50, q: "tela", tipo_id: 2 }], page([{ id: 7 }], 3)),
    () => useProductSearch({ q: "tela", tipo_id: 2 }),
  );
  expect(result.products).toEqual([{ id: 7 }]);
  expect(result.total).toBe(3);
  expect(result.hasResults).toBe(true);
});

test("variant search reads [product-variants, selector, {limit, q}]", () => {
  const result = run(
    (client) => client.setQueryData(["product-variants", "selector", { limit: 50, q: "AV" }], page([{ id: 9 }])),
    () => useProductVariantSearch({ q: "AV" }),
  );
  expect(result.variants).toEqual([{ id: 9 }]);
});

test("totals read the one-row pages", () => {
  const products = run(
    (client) => client.setQueryData(["products", "selector", { limit: 1, tipo_id: "1,3" }], page([], 12)),
    () => useProductSelectorTotal({ tipo_id: [1, 3] }),
  );
  const variants = run(
    (client) => client.setQueryData(["product-variants", "selector", { limit: 1 }], page([], 0)),
    () => useProductVariantSelectorTotal(),
  );
  expect(products.total).toBe(12);
  expect(variants.total).toBe(0);
});
