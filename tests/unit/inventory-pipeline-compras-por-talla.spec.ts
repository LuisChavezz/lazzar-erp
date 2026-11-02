import { expect, test } from "@playwright/test";
import { mapInventoryPipelineRow } from "@/src/features/inventory-pipeline/utils/inventory-pipeline.utils";
import type { InventoryPipelineResultadoApi } from "@/src/features/inventory-pipeline/interfaces/inventory-pipeline.interface";

/**
 * Pruebas unitarias de EC-684: las compras pendientes por talla del reporte de
 * existencias, producción y compras. Las tallas son la unión de los cuatro
 * mapas, el total por talla es el del backend (sin compras) y lo que no se
 * puede atribuir a una talla queda como residuo "Sin talla".
 */
const resultado = (
  overrides: Partial<InventoryPipelineResultadoApi>,
): InventoryPipelineResultadoApi => ({
  producto_id: 1,
  codigo: "2125CIE",
  descripcion: "CAMISA",
  disponible_por_talla: { CH: "10.0000", M: "5.0000" },
  produccion_por_talla: { CH: "2.0000", M: "0.0000" },
  total_por_talla: { CH: "12.0000", M: "5.0000" },
  disponible_total: "15.0000",
  produccion_total: "2.0000",
  compras_pendiente_cantidad: "0.0000",
  compras_por_talla: {},
  ordenes_produccion: [],
  ordenes_compra: [],
  ...overrides,
});

test.describe("compras por talla", () => {
  test("una talla que solo se compra aparece con 0 en lo demás", () => {
    const row = mapInventoryPipelineRow(
      resultado({ compras_pendiente_cantidad: "7.0000", compras_por_talla: { CH: "4.0000", G: "3.0000" } }),
    );
    expect(row.tallas.map((t) => [t.talla, t.disponible, t.enOp, t.total, t.compras])).toEqual([
      ["CH", 10, 2, 12, 4],
      ["G", 0, 0, 0, 3],
      ["M", 5, 0, 5, 0],
    ]);
  });

  test("el total por talla es el del backend, sin sumar compras", () => {
    const row = mapInventoryPipelineRow(
      resultado({ compras_pendiente_cantidad: "4.0000", compras_por_talla: { CH: "4.0000" } }),
    );
    expect(row.tallas.find((t) => t.talla === "CH")?.total).toBe(12);
    expect(row.total).toBe(17);
  });

  test("lo no desglosado queda como residuo sin talla", () => {
    const row = mapInventoryPipelineRow(
      resultado({ compras_pendiente_cantidad: "70.0000", compras_por_talla: { CH: "40.0000" } }),
    );
    expect(row.comprasSinTalla).toBe(30);
  });

  test("sin residuo cuando todo se desglosa, aun con decimales", () => {
    const row = mapInventoryPipelineRow(
      resultado({
        compras_pendiente_cantidad: "0.3000",
        compras_por_talla: { CH: "0.1000", M: "0.2000" },
      }),
    );
    expect(row.comprasSinTalla).toBe(0);
  });

  test('"N/A" es una talla más', () => {
    const row = mapInventoryPipelineRow(
      resultado({ compras_pendiente_cantidad: "2.0000", compras_por_talla: { "N/A": "2.0000" } }),
    );
    expect(row.tallas.map((t) => t.talla)).toContain("N/A");
    expect(row.comprasSinTalla).toBe(0);
  });
});
