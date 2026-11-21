import { expect, test } from "@playwright/test";
import {
  receiptSerieCodigo,
  receiptSeriePreseleccionada,
  receiptSeriesDeSucursal,
} from "../../src/features/receipts/utils/receiptSeries";
import {
  buildReceiptFormSchema,
  SERIES_SUCURSAL_EMPTY_MESSAGE,
} from "../../src/features/receipts/schemas/receipt.schema";

let nextId = 1;
const serie = (tipo_documento: string, serie: string, sucursal_id: number) => ({
  id_serie_folio: nextId++,
  tipo_documento,
  serie,
  sucursal_id,
});

test.describe("series de recepción (EC-922)", () => {
  test("el código sale de la serie con tipo RECEPCION, o del tipo RC/RT/RZ", () => {
    expect(receiptSerieCodigo(serie("RECEPCION", "RT", 1))).toBe("RT");
    expect(receiptSerieCodigo(serie("recepcion", "rz", 1))).toBe("RZ");
    expect(receiptSerieCodigo(serie("RC", "A", 1))).toBe("RC");
    expect(receiptSerieCodigo(serie("RECEPCION", "X", 1))).toBeNull();
    expect(receiptSerieCodigo(serie("FACTURA", "RC", 1))).toBeNull();
  });

  test("solo las de la sucursal de la orden, sin repetir y en orden RC, RT, RZ", () => {
    const series = [
      serie("RECEPCION", "RZ", 1),
      serie("RT", "RT", 1),
      serie("RECEPCION", "RT", 1),
      serie("RECEPCION", "RC", 2),
    ];
    expect(receiptSeriesDeSucursal(series, 1)).toEqual(["RT", "RZ"]);
    expect(receiptSeriesDeSucursal(series, 2)).toEqual(["RC"]);
    expect(receiptSeriesDeSucursal(series, 3)).toEqual([]);
    expect(receiptSeriesDeSucursal(series, null)).toEqual([]);
  });

  test("preselecciona RC si está, la única si hay una, y nada con varias sin RC o ninguna", () => {
    expect(receiptSeriePreseleccionada(["RC", "RT", "RZ"])).toBe("RC");
    expect(receiptSeriePreseleccionada(["RT", "RC"])).toBe("RC");
    expect(receiptSeriePreseleccionada(["RZ"])).toBe("RZ");
    expect(receiptSeriePreseleccionada(["RT", "RZ"])).toBe("");
    expect(receiptSeriePreseleccionada([])).toBe("");
  });

  test.describe("el esquema bloquea guardar sin una serie de la sucursal", () => {
    const base = {
      almacen: 1,
      remision: "",
      factura_referencia: "",
      observaciones: "",
      cantidades: {},
    };
    const serieError = (seriesDisponibles: string[] | undefined, serie_codigo: string) => {
      const parsed = buildReceiptFormSchema({ conRenglones: false, seriesDisponibles }).safeParse({
        ...base,
        serie_codigo,
      });
      return parsed.success ? null : parsed.error.issues.find((i) => i.path[0] === "serie_codigo")?.message;
    };

    test("una serie de la sucursal pasa", () => {
      expect(serieError(["RC", "RT"], "RT")).toBeNull();
    });

    test("sin elegir, o una que la sucursal no tiene, no pasa", () => {
      expect(serieError(["RT", "RZ"], "")).toBe("La serie de recepción es requerida");
      expect(serieError(["RT"], "RC")).toBe("La serie no está configurada en la sucursal de la orden");
    });

    test("una sucursal sin series no se puede guardar, y lo dice", () => {
      expect(serieError([], "")).toBe(SERIES_SUCURSAL_EMPTY_MESSAGE);
      expect(serieError([], "RC")).toBe(SERIES_SUCURSAL_EMPTY_MESSAGE);
    });

    test("sin catálogo de series se conserva la regla anterior (solo requerida)", () => {
      expect(serieError(undefined, "RT")).toBeNull();
      expect(serieError(undefined, "")).toBe("La serie de recepción es requerida");
    });
  });
});
