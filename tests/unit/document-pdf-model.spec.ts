import { expect, test } from "@playwright/test";
import {
  documentPdfCancellationReason,
  documentPdfFolioLabel,
  rowsHaveField,
  visiblePdfColumns,
  visiblePdfTotals,
} from "@/src/pdfs/shared/documentPdfModel";

/**
 * Reglas puras de la plantilla base de PDF (EC-855): qué columnas y renglones
 * de totales se pintan cuando el backend elimina las claves de importes, el
 * folio con respaldo `#id` y el motivo de cancelación. Corren con
 * `npm run test:unit`.
 */

type Line = { descripcion: string; precio?: string; importe?: string | null };

const columns = [
  { id: "descripcion" },
  { id: "precio", field: "precio" as const },
  { id: "importe", field: "importe" as const },
];

test.describe("visiblePdfColumns", () => {
  test("muestra las columnas ligadas a una clave que viene en los renglones", () => {
    const rows: Line[] = [{ descripcion: "A", precio: "10.00", importe: "20.00" }];
    expect(visiblePdfColumns(columns, rows).map((c) => c.id)).toEqual([
      "descripcion",
      "precio",
      "importe",
    ]);
  });

  test("omite las columnas cuya clave el backend eliminó", () => {
    const rows: Line[] = [{ descripcion: "A" }, { descripcion: "B" }];
    expect(visiblePdfColumns(columns, rows).map((c) => c.id)).toEqual(["descripcion"]);
  });

  test("basta con que UN renglón traiga la clave", () => {
    const rows: Line[] = [{ descripcion: "A" }, { descripcion: "B", precio: "5.00" }];
    expect(visiblePdfColumns(columns, rows).map((c) => c.id)).toEqual(["descripcion", "precio"]);
  });

  test("una clave presente con null cuenta como presente (dato vacío, no oculto)", () => {
    expect(rowsHaveField<Line>([{ descripcion: "A", importe: null }], "importe")).toBe(true);
  });

  test("sin renglones solo quedan las columnas sin clave", () => {
    expect(visiblePdfColumns(columns, [] as Line[]).map((c) => c.id)).toEqual(["descripcion"]);
  });
});

test.describe("visiblePdfTotals", () => {
  test("omite los renglones sin valor", () => {
    expect(
      visiblePdfTotals([
        { label: "Piezas", value: "10" },
        { label: "Subtotal", value: undefined },
        { label: "TOTAL", value: undefined, emphasis: true },
      ]).map((r) => r.label),
    ).toEqual(["Piezas"]);
  });

  test("sin ningún valor no queda nada que pintar", () => {
    expect(visiblePdfTotals([{ label: "TOTAL", value: undefined }])).toEqual([]);
  });
});

test.describe("documentPdfFolioLabel", () => {
  test("usa el folio cuando existe", () => {
    expect(documentPdfFolioLabel("OC-00012", 7)).toBe("OC-00012");
  });

  test("cae a #id con folio nulo, vacío o en blanco", () => {
    expect(documentPdfFolioLabel(null, 7)).toBe("#7");
    expect(documentPdfFolioLabel(undefined, 7)).toBe("#7");
    expect(documentPdfFolioLabel("", 7)).toBe("#7");
    expect(documentPdfFolioLabel("   ", 7)).toBe("#7");
  });
});

test.describe("documentPdfCancellationReason", () => {
  test("solo imprime el motivo de un documento cancelado", () => {
    expect(documentPdfCancellationReason({ cancelled: true, cancellationReason: " Duplicada " })).toBe(
      "Duplicada",
    );
    expect(documentPdfCancellationReason({ cancelled: false, cancellationReason: "Duplicada" })).toBeNull();
  });

  test("un motivo vacío no se imprime", () => {
    expect(documentPdfCancellationReason({ cancelled: true, cancellationReason: "  " })).toBeNull();
    expect(documentPdfCancellationReason({ cancelled: true })).toBeNull();
  });
});
