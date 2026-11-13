import { expect, test } from "@playwright/test";
import { toCatalogSelectorQuery } from "@/src/utils/catalogSelectorQuery";
import { productSelectorQueryKey } from "@/src/features/products/hooks/useProductSelector";
import { productVariantSelectorQueryKey } from "@/src/features/product-variants/hooks/useProductVariantSelector";

test.describe("toCatalogSelectorQuery", () => {
  test("joins arrays with commas instead of axios' ids[]= form", () => {
    expect(toCatalogSelectorQuery({ ids: [3, 1], tipo_id: [1, 3] })).toEqual({
      ids: "3,1",
      tipo_id: "1,3",
    });
  });

  test("drops empty text, empty arrays and undefined", () => {
    expect(toCatalogSelectorQuery({ q: "   ", ids: [], tiene_bom: undefined })).toEqual({});
  });

  test("trims text and keeps numbers and booleans as they are", () => {
    expect(toCatalogSelectorQuery({ q: "  playera ", limit: 50, tiene_bom: false })).toEqual({
      limit: 50,
      q: "playera",
      tiene_bom: false,
    });
  });

  test("gives the same key whatever the order of the params", () => {
    expect(JSON.stringify(toCatalogSelectorQuery({ q: "a", limit: 50 }))).toBe(
      JSON.stringify(toCatalogSelectorQuery({ limit: 50, q: "a" })),
    );
  });
});

test.describe("catalog selector query keys", () => {
  test("live under the prefixes the existing mutations invalidate", () => {
    expect(productSelectorQueryKey({ q: "x" }).slice(0, 2)).toEqual(["products", "selector"]);
    expect(productVariantSelectorQueryKey({ q: "x" }).slice(0, 2)).toEqual([
      "product-variants",
      "selector",
    ]);
  });

  test("an empty search and no search share one cache entry", () => {
    expect(productVariantSelectorQueryKey({ q: "", limit: 50 })).toEqual(
      productVariantSelectorQueryKey({ limit: 50 }),
    );
  });
});
