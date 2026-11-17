import { expect, test } from "@playwright/test";
import { parseSkuList } from "../../src/features/pre-orders/utils/parseSkuList";

test.describe("parseSkuList", () => {
  test("lee columnas pegadas de Excel (tabulador)", () => {
    const r = parseSkuList("SKU\tCantidad\nbta-dam-m\t300\nFIL-G\t1,200\n");
    expect(r.lines).toEqual([
      { sku: "BTA-DAM-M", cantidad: 300 },
      { sku: "FIL-G", cantidad: 1200 },
    ]);
    expect(r.invalid).toEqual([]);
  });

  test("acepta coma, punto y coma o espacios", () => {
    const r = parseSkuList("A-1,10\nB-2;20\nC-3   30\nD-4 40");
    expect(r.lines.map((l) => l.cantidad)).toEqual([10, 20, 30, 40]);
  });

  test("suma SKUs repetidos y los reporta", () => {
    const r = parseSkuList("A-1\t10\na-1\t5");
    expect(r.lines).toEqual([{ sku: "A-1", cantidad: 15 }]);
    expect(r.merged).toEqual(["A-1"]);
  });

  test("acepta hasta 4 decimales y omite lo inválido", () => {
    const r = parseSkuList("A-1\t10\nB-2\t0\nC-3\tabc\nD-4\t12.75\nE-5\t1.23456");
    expect(r.lines).toEqual([
      { sku: "A-1", cantidad: 10 },
      { sku: "D-4", cantidad: 12.75 },
    ]);
    expect(r.invalid).toEqual(["B-2\t0", "C-3\tabc", "E-5\t1.23456"]);
  });
});
