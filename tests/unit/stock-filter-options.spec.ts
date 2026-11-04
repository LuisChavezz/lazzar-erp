import { expect, test } from "@playwright/test";
import {
  stockResumenFilterOptions,
  withActiveStockFilterOption,
} from "@/src/features/stock/utils/stockFilterOptions";
import type { StockPorAlmacenResumen } from "@/src/features/stock/interfaces/stock-por-almacen.interface";

/**
 * Pruebas unitarias de EC-766: opciones de los filtros de encabezado de
 * existencias a partir del resumen del almacén.
 */

const resumen: StockPorAlmacenResumen = {
  almacen_id: 1,
  max_stock: 100,
  kpis: { total_registros: 2, skus_en_existencia: 2, requiere_stock: 0, total_stock: 150 },
  opciones: {
    nombre: [{ value: "Playera ", label: "Playera" }],
    tipo: [{ value: "PT", label: "PT" }],
    color: [{ value: "MARINO", label: "MARINO" }],
    ubicacion: [{ value: 7, label: "PT - AA-01-01-01" }],
    mes: [{ value: "2026-11", label: "Noviembre 2026" }],
  },
};

test.describe("stockResumenFilterOptions", () => {
  test("antepone Todos, pasa el valor a texto y conserva el valor crudo", () => {
    const options = stockResumenFilterOptions(resumen);
    expect(options.nombre).toEqual([
      { value: undefined, label: "Todos" },
      { value: "Playera ", label: "Playera" },
    ]);
    expect(options.ubicacion[1]).toEqual({ value: "7", label: "PT - AA-01-01-01" });
  });

  test("arma las opciones una sola vez por respuesta", () => {
    expect(stockResumenFilterOptions(resumen)).toBe(stockResumenFilterOptions(resumen));
    expect(stockResumenFilterOptions({ ...resumen })).not.toBe(stockResumenFilterOptions(resumen));
  });
});

test.describe("withActiveStockFilterOption", () => {
  const options = stockResumenFilterOptions(resumen);

  test("sin valor activo o con uno conocido, deja las opciones tal cual", () => {
    expect(withActiveStockFilterOption(options.nombre, "nombre", undefined)).toBe(options.nombre);
    expect(withActiveStockFilterOption(options.tipo, "tipo", "PT")).toBe(options.tipo);
  });

  test("nombra un valor activo que el resumen no trae, justo después de Todos", () => {
    expect(withActiveStockFilterOption(options.ubicacion, "ubicacion", "55")).toEqual([
      { value: undefined, label: "Todos" },
      { value: "55", label: "Ubicación #55" },
      { value: "7", label: "PT - AA-01-01-01" },
    ]);
    expect(withActiveStockFilterOption(options.nombre, "nombre", "Chamarra")[1]).toEqual({
      value: "Chamarra",
      label: "Chamarra",
    });
    expect(withActiveStockFilterOption(options.mes, "mes", "2025-01")[1]).toEqual({
      value: "2025-01",
      label: "Enero 2025",
    });
  });
});
