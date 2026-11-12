import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  VARIANT_ONLY_FILTERS,
  readRotationAgrupar,
  rotationBoardProductTable,
  rotationBoardVariantTable,
} from "@/src/features/rotation-board/constants/rotationBoardTable";
import { isRotationShortcutActive } from "@/src/features/rotation-board/utils/rotationBoardShortcuts";
import { canonicalServerTableQuery } from "@/src/utils/serverTableParams";
import { rowFabricationCell } from "@/src/features/rotation-board/utils/rotationBoardFabrication";
import type { RotationBoardRow } from "@/src/features/rotation-board/interfaces/rotation-board.interface";
import {
  formatPercent,
  formatPieces,
  formatSharePercent,
  formatWeeklyRate,
  rotationBoardFieldErrorMessage,
  weeklySeriesRanges,
} from "@/src/features/rotation-board/utils/rotationBoardFormat";
import { readServerTableState, toServerTableCriteria } from "@/src/utils/serverTableParams";
import {
  importeCurrencyTotals,
  normalizeImportePorMoneda,
} from "@/src/features/rotation-board/utils/rotationBoardAmounts";
import { rotationBranchOptions } from "@/src/features/rotation-board/utils/rotationBoardBranches";
import { formatCurrencyBlockAmount } from "@/src/components/CurrencyTotalsValue";
import { formatInCurrency } from "@/src/utils/currencyTotals";
import { formatKpiTaggedCurrencyAmount } from "@/src/utils/kpiFormat";

/** Pruebas unitarias del tablero de rotación de Planeación (EC-867). */

const criteriaOf = (definition: typeof rotationBoardVariantTable, query: string) => {
  const params = new URLSearchParams(query);
  return toServerTableCriteria(
    definition,
    readServerTableState(definition, (key) => params.get(key)),
  );
};

test.describe("definiciones del tablero", () => {
  test("sin parámetros envía los defaults de cálculo y el orden por defecto", () => {
    expect(criteriaOf(rotationBoardVariantTable, "")).toEqual({
      semanas: "12",
      semanas_objetivo: "8",
      dias_sin_venta: "90",
      agrupar: "variante",
      ordering: "-vendido_periodo",
    });
  });

  test("valores fuera del rango del backend se tratan como ausentes", () => {
    expect(criteriaOf(rotationBoardVariantTable, "semanas=105&semanas_objetivo=0&dias_sin_venta=731")).toEqual({
      semanas: "12",
      semanas_objetivo: "8",
      dias_sin_venta: "90",
      agrupar: "variante",
      ordering: "-vendido_periodo",
    });
  });

  test("nunca se ordena por importe_vendido", () => {
    expect(criteriaOf(rotationBoardVariantTable, "ordering=-importe_vendido").ordering).toBe(
      "-vendido_periodo",
    );
  });

  test("por producto no existen fabricacion ni el orden por SKU o fabricable", () => {
    const product = rotationBoardProductTable as unknown as typeof rotationBoardVariantTable;
    const criteria = criteriaOf(
      product,
      "agrupar=producto&fabricacion=ALCANZA&ordering=sku&estado=LENTO",
    );
    expect(criteria).toEqual({
      semanas: "12",
      semanas_objetivo: "8",
      dias_sin_venta: "90",
      agrupar: "producto",
      estado: "LENTO",
      ordering: "-vendido_periodo",
    });
    expect(criteriaOf(product, "ordering=-fabricable_con_existencia").ordering).toBe(
      "-vendido_periodo",
    );
  });

  test("solo_candidatos solo viaja encendido", () => {
    expect(criteriaOf(rotationBoardVariantTable, "solo_candidatos=true").solo_candidatos).toBe("true");
    expect(criteriaOf(rotationBoardVariantTable, "solo_candidatos=false").solo_candidatos).toBeUndefined();
  });
});

test.describe("weeklySeriesRanges", () => {
  test("ventanas móviles de 7 días que terminan en `hasta`, de la más antigua a la actual", () => {
    expect(weeklySeriesRanges("2026-11-12", 3)).toEqual([
      { from: "2026-10-23", to: "2026-10-29" },
      { from: "2026-10-30", to: "2026-11-05" },
      { from: "2026-11-06", to: "2026-11-12" },
    ]);
  });

  test("cruza meses y años en aritmética UTC", () => {
    expect(weeklySeriesRanges("2026-01-03", 1)).toEqual([{ from: "2025-12-28", to: "2026-01-03" }]);
  });

  test("12 semanas desde la respuesta real: mismas etiquetas que antes", () => {
    const ranges = weeklySeriesRanges("2026-11-12", 12);
    expect(ranges[0]).toEqual({ from: "2026-08-21", to: "2026-08-27" });
    expect(ranges[11]).toEqual({ from: "2026-11-06", to: "2026-11-12" });
  });

  test("una fecha inválida no produce rangos", () => {
    expect(weeklySeriesRanges("2026-02-30", 4)).toEqual([]);
    expect(weeklySeriesRanges("", 4)).toEqual([]);
  });
});

test.describe("formato", () => {
  test("piezas enteras y guion para null", () => {
    expect(formatPieces(5758.0)).toBe("5,758");
    expect(formatPieces(1652.4)).toBe("1,652");
    expect(formatPieces(null)).toBe("—");
  });

  test("la venta semanal conserva un decimal", () => {
    expect(formatWeeklyRate(0.08)).toBe("0.1");
    expect(formatWeeklyRate(54.33)).toBe("54.3");
  });

  test("porcentajes con signo", () => {
    expect(formatPercent(27, { signed: true })).toBe("+27 %");
    expect(formatPercent(-8.4, { signed: true })).toBe("−8.4 %");
    expect(formatPercent(null)).toBe("—");
  });
});

test.describe("rotationBoardFieldErrorMessage", () => {
  const error400 = (data: unknown, status = 400) =>
    new AxiosError("Bad Request", "ERR_BAD_REQUEST", undefined, undefined, {
      status,
      statusText: "",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data,
    });

  test("nombra cada campo con su etiqueta", () => {
    expect(
      rotationBoardFieldErrorMessage(
        error400({
          semanas: ["Asegúrese de que este valor es mayor o igual a 1."],
          clase: ['"D" no es una elección válida.'],
        }),
      ),
    ).toBe(
      'Semanas de análisis: Asegúrese de que este valor es mayor o igual a 1. · Clase: "D" no es una elección válida.',
    );
  });

  test("detail sin etiqueta; otros estados no aplican", () => {
    expect(rotationBoardFieldErrorMessage(error400({ detail: "Tu usuario no tiene una empresa activa." }))).toBe(
      "Tu usuario no tiene una empresa activa.",
    );
    expect(rotationBoardFieldErrorMessage(error400({ detail: "x" }, 500))).toBeUndefined();
    expect(rotationBoardFieldErrorMessage(new Error("x"))).toBeUndefined();
  });
});

test.describe("rowFabricationCell", () => {
  const row = (overrides: Partial<RotationBoardRow>) =>
    ({
      tiene_bom: true,
      resurtido_sugerido: 10,
      puede_fabricar_resurtido: null,
      fabricable_con_existencia: 100,
      ...overrides,
    }) as RotationBoardRow;

  test("sin resurtido: Sin BOM o nada, como antes", () => {
    expect(rowFabricationCell(row({ resurtido_sugerido: 0, tiene_bom: false }))).toBe("SIN_BOM");
    expect(rowFabricationCell(row({ resurtido_sugerido: 0 }))).toBeNull();
  });

  test("con resurtido distingue Sin BOM, alcanza, no alcanza y BOM no calculable", () => {
    expect(rowFabricationCell(row({ tiene_bom: false, fabricable_con_existencia: null }))).toBe("SIN_BOM");
    expect(rowFabricationCell(row({ puede_fabricar_resurtido: true }))).toBe("ALCANZA");
    expect(rowFabricationCell(row({ puede_fabricar_resurtido: false }))).toBe("NO_ALCANZA");
    expect(rowFabricationCell(row({ fabricable_con_existencia: null }))).toBe("NO_CALCULABLE");
  });
});

test.describe("formatSharePercent", () => {
  test("una participación real pero mínima no sale como 0 %", () => {
    expect(formatSharePercent(0.02)).toBe("< 0.1 %");
    expect(formatSharePercent(0.049)).toBe("< 0.1 %");
  });

  test("el resto conserva el formato de un decimal", () => {
    expect(formatSharePercent(0.05)).toBe("0.1 %");
    expect(formatSharePercent(11.32)).toBe("11.3 %");
    expect(formatSharePercent(0)).toBe("0 %");
    expect(formatSharePercent(null)).toBe("—");
  });
});

test.describe("tarjetas activas", () => {
  test("Candidatos y un estado del encabezado se ven activas a la vez", () => {
    const filters = { solo_candidatos: true as const, estado: "SOBREINVENTARIO" as const };
    expect(isRotationShortcutActive(filters, "CANDIDATOS")).toBe(true);
    expect(isRotationShortcutActive(filters, "SOBREINVENTARIO")).toBe(true);
    expect(isRotationShortcutActive(filters, "RESURTIR")).toBe(false);
  });

  test("sin filtros ninguna está activa", () => {
    expect(isRotationShortcutActive({}, "CANDIDATOS")).toBe(false);
    expect(isRotationShortcutActive({}, "LENTO")).toBe(false);
  });
});

test.describe("modo producto: claves solo de variante", () => {
  const canonicalProduct = (query: string) =>
    canonicalServerTableQuery(
      rotationBoardProductTable,
      new URLSearchParams(query),
      VARIANT_ONLY_FILTERS,
    ).toString();

  test("un enlace con fabricacion la pierde en modo producto", () => {
    expect(canonicalProduct("agrupar=producto&fabricacion=NO_ALCANZA")).toBe("agrupar=producto");
  });

  test("un orden por un campo solo de variante también se quita", () => {
    expect(canonicalProduct("agrupar=producto&ordering=-fabricable_con_existencia&estado=LENTO")).toBe(
      "agrupar=producto&estado=LENTO",
    );
    expect(canonicalProduct("agrupar=producto&ordering=sku")).toBe("agrupar=producto");
  });
});

test.describe("readRotationAgrupar", () => {
  const read = (query: string) => {
    const params = new URLSearchParams(query);
    return readRotationAgrupar((key) => params.get(key));
  };

  test("lee solo su parámetro con su codec y default", () => {
    expect(read("")).toBe("variante");
    expect(read("agrupar=producto")).toBe("producto");
    expect(read("agrupar=modelo")).toBe("variante");
  });
});

test.describe("importe_por_moneda (#1109)", () => {
  test("ausente, null o algo que no es diccionario es null (sin permiso)", () => {
    expect(normalizeImportePorMoneda(undefined)).toBeNull();
    expect(normalizeImportePorMoneda(null)).toBeNull();
    expect(normalizeImportePorMoneda(1234.5)).toBeNull();
    expect(normalizeImportePorMoneda([])).toBeNull();
  });

  test("{} se conserva: sin venta, no sin permiso", () => {
    expect(normalizeImportePorMoneda({})).toEqual({});
  });

  test("importes numéricos o decimales en texto; uno ilegible invalida todo", () => {
    expect(normalizeImportePorMoneda({ MXN: 1685828.74, USD: "785095.00" })).toEqual({
      MXN: 1685828.74,
      USD: 785095,
    });
    expect(normalizeImportePorMoneda({ MXN: 10, USD: "abc" })).toBeNull();
    expect(normalizeImportePorMoneda({ MXN: null })).toBeNull();
  });

  test("ordena por código y deja la moneda sin código (S/M) al final como desconocida", () => {
    expect(importeCurrencyTotals({ "S/M": 5, XTS: 7740, MXN: 100, USD: 50 })).toEqual([
      { moneda: "MXN", total: 100 },
      { moneda: "USD", total: 50 },
      { moneda: "XTS", total: 7740 },
      { moneda: null, total: 5 },
    ]);
    expect(importeCurrencyTotals({})).toEqual([]);
  });
});

test.describe("filtro de sucursal", () => {
  const BRANCHES = [
    { id: 61, nombre: "Matriz" },
    { id: 72, nombre: "Norte" },
  ];

  test("viaja como sucursal en ambos modos; un id inválido se trata como ausente", () => {
    expect(criteriaOf(rotationBoardVariantTable, "sucursal=61").sucursal).toBe("61");
    const productParams = new URLSearchParams("agrupar=producto&sucursal=61");
    const productCriteria = toServerTableCriteria(
      rotationBoardProductTable,
      readServerTableState(rotationBoardProductTable, (key) => productParams.get(key)),
    );
    expect(productCriteria.sucursal).toBe("61");
    expect(criteriaOf(rotationBoardVariantTable, "sucursal=0")).not.toHaveProperty("sucursal");
    expect(criteriaOf(rotationBoardVariantTable, "sucursal=abc")).not.toHaveProperty("sucursal");
  });

  test("el modo producto no la quita de la URL", () => {
    const query = canonicalServerTableQuery(
      rotationBoardProductTable,
      new URLSearchParams("agrupar=producto&sucursal=61&fabricacion=ALCANZA"),
      VARIANT_ONLY_FILTERS,
    );
    expect(query.get("sucursal")).toBe("61");
    expect(query.has("fabricacion")).toBe(false);
  });

  test("Todas mis sucursales primero y luego el catálogo en su orden", () => {
    expect(rotationBranchOptions(BRANCHES, null)).toEqual([
      { value: "", label: "Todas mis sucursales" },
      { value: "61", label: "Matriz" },
      { value: "72", label: "Norte" },
    ]);
  });

  test("una sucursal de la URL que no está en el catálogo queda fijada a la vista", () => {
    expect(rotationBranchOptions(BRANCHES, 99).slice(0, 2)).toEqual([
      { value: "", label: "Todas mis sucursales" },
      { value: "99", label: "Sucursal #99" },
    ]);
    expect(rotationBranchOptions(BRANCHES, 72)).toHaveLength(3);
  });

  test("mientras el catálogo carga, la sucursal de la URL no se rotula como desconocida", () => {
    expect(rotationBranchOptions([], 1, true)).toEqual([
      { value: "", label: "Todas mis sucursales" },
      { value: "1", label: "Cargando sucursales..." },
    ]);
    expect(rotationBranchOptions([], 1, false)[1]).toEqual({ value: "1", label: "Sucursal #1" });
  });

  test("el 400 de sucursal se lee con su etiqueta", () => {
    const error = new AxiosError("Bad Request", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 400,
      statusText: "Bad Request",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { sucursal: ["Sucursal no encontrada."] },
    });
    expect(rotationBoardFieldErrorMessage(error)).toBe("Sucursal: Sucursal no encontrada.");
  });
});

test.describe("formatCurrencyBlockAmount (importe por moneda del tablero)", () => {
  test("mismo texto que la regla de bloques etiquetados: símbolo propio, XTS y sin moneda sin símbolo", () => {
    for (const [moneda, total] of [["MXN", 1685828.74], ["USD", 785095], ["XTS", 7740]] as const) {
      expect(formatCurrencyBlockAmount({ moneda, total })).toBe(formatKpiTaggedCurrencyAmount(total, moneda));
    }
    expect(formatCurrencyBlockAmount({ moneda: null, total: 5 })).toBe(formatInCurrency(5, null));
    expect(formatCurrencyBlockAmount({ moneda: "XTS", total: 7740 })).not.toContain("XTS");
  });
});
