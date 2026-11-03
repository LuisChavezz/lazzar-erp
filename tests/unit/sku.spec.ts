import { expect, test } from "@playwright/test";
import { formatSku, hasLineCode, splitSku } from "@/src/utils/sku";

test.describe("SKU estilo Inditex", () => {
  test("separa modelo (4), color (3) y talla", () => {
    expect(splitSku("1000503CH")).toEqual({ modelo: "1000", color: "503", talla: "CH" });
    expect(splitSku("1000503G")).toEqual({ modelo: "1000", color: "503", talla: "G" });
    expect(splitSku("1000503xl")?.talla).toBe("XL");
    expect(formatSku("1000503CH")).toBe("1000 / 503 / CH");
  });

  test("lo que no sigue el formato se muestra tal cual", () => {
    expect(splitSku("36V9")).toBeNull();
    expect(splitSku("1A330-BLA")).toBeNull();
    expect(formatSku("1A330-BLA")).toBe("1A330-BLA");
    expect(formatSku(null)).toBe("");
  });

  test("hay columna si algún renglón trae SKU o código del producto", () => {
    expect(hasLineCode([{ producto_variante_sku: null, producto_codigo: "36V9" }])).toBe(true);
    expect(hasLineCode([{ producto_variante_sku: "1000503CH" }])).toBe(true);
    expect(hasLineCode([{ producto_variante_sku: null, producto_codigo: " " }])).toBe(false);
  });
});
