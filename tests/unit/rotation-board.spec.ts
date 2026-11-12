import { expect, test } from "@playwright/test";
import { AxiosError, AxiosHeaders } from "axios";
import {
  rotationBoardProductTable,
  rotationBoardVariantTable,
} from "@/src/features/rotation-board/constants/rotationBoardTable";
import { rowFabricacion } from "@/src/features/rotation-board/components/RotationBoardColumns";
import type { RotationBoardRow } from "@/src/features/rotation-board/interfaces/rotation-board.interface";
import {
  formatPercent,
  formatPieces,
  formatWeeklyRate,
  rotationBoardFieldErrorMessage,
  weeklySeriesRanges,
} from "@/src/features/rotation-board/utils/rotationBoardFormat";
import { readServerTableState, toServerTableCriteria } from "@/src/utils/serverTableParams";

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

test.describe("rowFabricacion", () => {
  const row = (overrides: Partial<RotationBoardRow>) => ({ tiene_bom: true, puede_fabricar_resurtido: null, ...overrides }) as RotationBoardRow;

  test("deriva el mismo valor que filtra ?fabricacion=", () => {
    expect(rowFabricacion(row({ tiene_bom: false }))).toBe("SIN_BOM");
    expect(rowFabricacion(row({ puede_fabricar_resurtido: true }))).toBe("ALCANZA");
    expect(rowFabricacion(row({ puede_fabricar_resurtido: false }))).toBe("NO_ALCANZA");
    expect(rowFabricacion(row({}))).toBeNull();
  });
});
