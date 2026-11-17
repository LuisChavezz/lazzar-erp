import { expect, test } from "@playwright/test";
import { compareSizes } from "../../src/features/pre-orders/utils/sizeOrder";

test.describe("compareSizes", () => {
  test("ordena de menor a mayor con múltiplos", () => {
    const tallas = ["6XG", "M", "2XCH", "XG", "CH", "3XG", "XCH", "G", "2XG"];
    expect([...tallas].sort(compareSizes)).toEqual(["2XCH", "XCH", "CH", "M", "G", "XG", "2XG", "3XG", "6XG"]);
  });

  test("numéricas por valor y desconocidas al final", () => {
    expect(["10", "8", "UNI", "28"].sort(compareSizes)).toEqual(["8", "10", "28", "UNI"]);
  });

  test("equivalentes en inglés", () => {
    expect(["XL", "S", "L", "XXL", "M"].sort(compareSizes)).toEqual(["S", "M", "L", "XL", "XXL"]);
  });
});
