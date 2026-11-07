import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import {
  getQuoteClienteLabel,
  getQuoteColumns,
} from "@/src/features/quotes/components/QuoteColumns";
import { buildQuotesCsv } from "@/src/features/quotes/hooks/useQuoteCsvExport";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { getQuoteStatusLabel } from "@/src/features/quotes/constants/quoteStatus";
import type { Quote } from "@/src/features/quotes/interfaces/quote.interface";
import {
  getRecentQuotesRange,
  quoteClienteParam,
  quotesTable,
  QUOTE_ESTATUS_VALUES,
} from "@/src/features/quotes/utils/quoteListParams";
import { buildQuoteClienteFilterOptions } from "@/src/features/quotes/utils/quoteFilterOptions";
import {
  readServerTableState,
  toServerTableCriteria,
} from "@/src/utils/serverTableParams";

/**
 * Pruebas unitarias del listado de cotizaciones de Ventas en MODO SERVIDOR
 * (EC-809): el contrato de la tabla con `GET /ventas/cotizaciones/`, las
 * opciones del filtro de cliente que salen de `opciones/` y lo que siguen
 * leyendo las exportaciones.
 */

const quote = (overrides: Partial<Quote>): Quote =>
  ({
    id: 1,
    estatus: 1,
    estatus_label: "BORRADOR",
    cliente: 10,
    cliente_nombre: "",
    cliente_razon_social: "",
    ...overrides,
  }) as Quote;

const criteriaOf = (query: Record<string, string>) =>
  toServerTableCriteria(
    quotesTable,
    readServerTableState(quotesTable, (key) => query[key] ?? null),
  );

test.describe("contrato de la tabla con el backend", () => {
  test("cada columna ordena y filtra por claves que la definición conoce", () => {
    const fields = quotesTable.ordering?.fields ?? [];
    const filterKeys = Object.keys(quotesTable.filters);
    const metas = getQuoteColumns().map((column) => ({
      // `accessor("id")` no declara `id`: lo toma de su `accessorKey`.
      id: column.id ?? ("accessorKey" in column ? String(column.accessorKey) : ""),
      ...(column.meta ?? {}),
    }));
    for (const meta of metas) {
      if (meta.serverSort) expect(fields).toContain(meta.serverSort);
      if (meta.serverFilter) expect(filterKeys).toContain(meta.serverFilter);
    }
    const byId = Object.fromEntries(metas.map((meta) => [meta.id, meta]));
    expect(byId.id).toMatchObject({ serverSort: "id", serverFilter: "estatus" });
    expect(byId.cliente_razon_social).toMatchObject({
      serverSort: "cliente__razon_social",
      serverFilter: "cliente",
    });
    expect(byId.importeSinIva).toMatchObject({ serverSort: "importe_sin_iva" });
    expect(byId.estatus).toMatchObject({ serverSort: "estatus", hiddenByDefault: true });
    // Sin orden en el servidor: no se ofrece ordenar.
    expect(byId.piezas?.serverSort).toBeUndefined();
  });

  test("vista por defecto: no se envía ordering (rige el del backend, nulos al final)", () => {
    expect(criteriaOf({})).toEqual({});
    // Elegir otra vez el orden por defecto es lo mismo: sin ordering.
    expect(criteriaOf({ ordering: "-created_at" })).toEqual({});
    // Ascendente sí se envía, con desempate.
    expect(criteriaOf({ ordering: "created_at" })).toEqual({ ordering: "created_at,-id" });
  });

  test("estatus: uno o varios del catálogo; uno desconocido invalida el valor", () => {
    expect(QUOTE_ESTATUS_VALUES).toEqual(["1", "2", "3", "4", "5"]);
    expect(criteriaOf({ estatus: "2" })).toMatchObject({ estatus: "2" });
    expect(criteriaOf({ estatus: "4,1" })).toMatchObject({ estatus: "1,4" });
    expect(criteriaOf({ estatus: "2,9" }).estatus).toBeUndefined();
  });

  test("cliente: un id positivo o sin_cliente; lo demás no se envía", () => {
    expect(quoteClienteParam.parse("47")).toBe(47);
    expect(quoteClienteParam.parse("sin_cliente")).toBe("sin_cliente");
    expect(quoteClienteParam.parse("0")).toBeNull();
    expect(quoteClienteParam.parse("abc")).toBeNull();
    expect(criteriaOf({ cliente: "sin_cliente" })).toMatchObject({ cliente: "sin_cliente" });
    expect(criteriaOf({ cliente: "-3" }).cliente).toBeUndefined();
  });

  test("búsqueda por q y orden por importe con desempate", () => {
    expect(criteriaOf({ q: "  acme " })).toMatchObject({ q: "acme" });
    expect(criteriaOf({ ordering: "-importe_sin_iva" })).toMatchObject({
      ordering: "-importe_sin_iva,-id",
    });
    // Un campo fuera de la lista blanca vuelve al orden por defecto (sin enviar).
    expect(criteriaOf({ ordering: "gran_total" }).ordering).toBeUndefined();
  });
});

test.describe("opciones del filtro de cliente (opciones/)", () => {
  test("Sin cliente primero, el casing de la celda y el id solo en homónimos", () => {
    const options = buildQuoteClienteFilterOptions([
      { value: 10, label: "ACME SA DE CV" },
      { value: 13, label: "ACME SA DE CV" },
      { value: 11, label: "Taller Norte" },
      { value: 12, label: "  " },
      { value: "sin_cliente", label: "Sin cliente" },
    ]);
    expect(options).toEqual([
      { value: "sin_cliente", label: "Sin cliente" },
      { value: "10", label: "Acme sa de cv (cliente #10)" },
      { value: "13", label: "Acme sa de cv (cliente #13)" },
      { value: "11", label: "Taller norte" },
      { value: "12", label: "Cliente #12" },
    ]);
  });

  test("sin la marca del backend no hay opción Sin cliente", () => {
    expect(buildQuoteClienteFilterOptions([{ value: 1, label: "Uno" }])).toEqual([
      { value: "1", label: "Uno" },
    ]);
  });
});

test.describe("rango de los últimos 30 días", () => {
  test("hoy incluido, en el día local", () => {
    expect(getRecentQuotesRange(new Date(2026, 10, 7, 23, 30))).toEqual({
      fecha_desde: "2026-10-09",
      fecha_hasta: "2026-11-07",
    });
    // Cruza de año sin desbordar.
    expect(getRecentQuotesRange(new Date(2026, 0, 5, 0, 5))).toEqual({
      fecha_desde: "2025-12-07",
      fecha_hasta: "2026-01-05",
    });
  });
});

test.describe("texto del cliente en la celda", () => {
  test("razón social con casing, nombre o respaldo; vacío sin cliente", () => {
    expect(getQuoteClienteLabel(quote({ cliente_razon_social: "ACME SA DE CV" }))).toBe("Acme sa de cv");
    expect(getQuoteClienteLabel(quote({ cliente: 12 }))).toBe("Cliente #12");
    expect(getQuoteClienteLabel(quote({ cliente_nombre: "Taller Norte" }))).toBe("Taller Norte");
    expect(
      getQuoteClienteLabel(quote({ cliente: null, cliente_nombre: null, cliente_razon_social: null })),
    ).toBe("");
  });
});

/**
 * Las exportaciones leen el valor de la columna (`accessorFn`), no la celda:
 * la razón social sale tal como la manda el backend, y el `id` es el que el
 * PDF usa para darle su ancho.
 */
test.describe("exportación de la razón social", () => {
  const column = getQuoteColumns().find((c) => c.id === "cliente_razon_social") as ColumnDef<
    Quote,
    unknown
  > & { accessorFn: (row: Quote, index: number) => unknown };

  test("el CSV lleva la razón social cruda (y vacía sin cliente)", () => {
    const visible: DataTableVisibleColumn<Quote>[] = [
      { id: "cliente_razon_social", header: "Razón social", accessorFn: column.accessorFn },
    ];
    const rows = [
      quote({ id: 1, cliente_razon_social: "ACME SA DE CV" }),
      quote({ id: 6, cliente: null, cliente_nombre: null, cliente_razon_social: null }),
    ];
    expect(buildQuotesCsv(rows, visible)).toBe(
      // La columna "Moneda" la agrega siempre el CSV (EC-618).
      ["Razón social,Moneda", "ACME SA DE CV,", ","].join("\n"),
    );
  });
});

test.describe("getQuoteStatusLabel", () => {
  test("conocido, desconocido con etiqueta, desconocido sin ella y ausente", () => {
    expect(getQuoteStatusLabel({ estatus: 3, estatus_label: "AUTORIZADA" })).toBe("Autorizada");
    expect(getQuoteStatusLabel({ estatus: 9, estatus_label: " EN PAUSA " })).toBe("En pausa");
    expect(getQuoteStatusLabel({ estatus: 9, estatus_label: null })).toBe("Estatus 9");
    expect(getQuoteStatusLabel({ estatus: null })).toBe("Sin estatus");
  });
});
