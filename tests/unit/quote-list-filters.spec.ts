import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { harness } from "./support/headerFilterHarness";
import {
  getQuoteClienteLabel,
  getQuoteColumns,
  getQuoteHeaderFilters,
} from "@/src/features/quotes/components/QuoteColumns";
import { buildQuotesCsv } from "@/src/features/quotes/hooks/useQuoteCsvExport";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { getQuoteStatusLabel, QUOTE_STATUS_CONFIG } from "@/src/features/quotes/constants/quoteStatus";
import type { Quote } from "@/src/features/quotes/interfaces/quote.interface";

/**
 * Pruebas unitarias de EC-752 sobre el listado de cotizaciones de Ventas: las
 * opciones y el `filterFn` de cada filtro de encabezado, y el texto que la
 * búsqueda global indexa. Se leen las columnas ya envueltas, sin renderizar.
 */

const labels = (options: { label: string }[]) => options.map((o) => o.label);

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

const rows = [
  quote({ id: 1, estatus: 1, cliente: 10, cliente_razon_social: "ACME SA DE CV" }),
  quote({ id: 2, estatus: 2, cliente: 11, cliente_razon_social: "", cliente_nombre: "Taller Norte" }),
  quote({ id: 3, estatus: 5, cliente: 12 }),
  // Estatus que el front no conoce: con su etiqueta del backend, y sin ella.
  quote({ id: 4, estatus: 7, estatus_label: "ARCHIVADA", cliente: 10, cliente_razon_social: "ACME SA DE CV" }),
  quote({ id: 5, estatus: 8, estatus_label: "", cliente: 13, cliente_razon_social: "ACME SA DE CV" }),
  // Borrador guardado sin cliente: el listado lo trae con `cliente: null`.
  quote({ id: 6, estatus: 1, cliente: null, cliente_nombre: null, cliente_razon_social: null }),
];

const t = harness<Quote>(
  withHeaderFilters(getQuoteColumns() as ColumnDef<Quote, unknown>[], rows, getQuoteHeaderFilters(rows)),
  rows,
);

test.describe("filtro de estatus (en el #id)", () => {
  test("el catálogo completo en su orden, con punto, y al final los desconocidos", () => {
    const options = t.options("id");
    expect(labels(options)).toEqual([
      "Todos",
      "Borrador",
      "Por Autorizar",
      "Autorizada",
      "Rechazada",
      "Cambios Solicitados",
      "Archivada",
      "Estatus 8",
    ]);
    // Cada opción del catálogo lleva el punto de su config.
    for (const [value, cfg] of Object.entries(QUOTE_STATUS_CONFIG)) {
      expect(options.find((o) => o.value === value)?.dotClassName).toBe(cfg.dot);
    }
    expect(t.column("id").meta?.filterLabel).toBe("Estatus");
  });

  test("filtra por el estatus crudo, también uno desconocido", () => {
    expect(t.matching("id", "2").map((r) => r.id)).toEqual([2]);
    expect(t.matching("id", "1").map((r) => r.id)).toEqual([1, 6]);
    expect(t.matching("id", "7").map((r) => r.id)).toEqual([4]);
    // Un estatus del catálogo sin filas no deja ninguna.
    expect(t.matching("id", "3")).toEqual([]);
  });
});

test.describe("filtro de cliente", () => {
  test("opciones de las filas, por id, con el texto de la celda y su respaldo", () => {
    // Dos clientes (10 y 13) con la misma razón social son DOS opciones: el
    // filtro compara el id, así que los homónimos no se mezclan, y SOLO esas
    // llevan el id del cliente para distinguirlas; las únicas quedan limpias.
    expect(labels(t.options("cliente_razon_social"))).toEqual([
      "Todos",
      "Sin cliente",
      "Acme sa de cv (cliente #10)",
      "Acme sa de cv (cliente #13)",
      "Cliente #12",
      "Taller Norte",
    ]);
    expect(t.matching("cliente_razon_social", "10").map((r) => r.id)).toEqual([1, 4]);
    expect(t.matching("cliente_razon_social", "13").map((r) => r.id)).toEqual([5]);
  });

  test("el borrador sin cliente tiene su opción y no indexa un texto inventado", () => {
    const sinCliente = t.options("cliente_razon_social")[1];
    expect(t.matching("cliente_razon_social", sinCliente.value as string).map((r) => r.id)).toEqual([6]);
    expect(t.cellText("cliente_razon_social", rows[5])).toBe("");
  });

  test("es buscable", () => {
    expect(t.column("cliente_razon_social").meta?.headerFilter?.searchable).toEqual({
      placeholder: "Buscar razón social…",
    });
  });
});

test.describe("texto que indexa la búsqueda global", () => {
  test("el estatus por su nombre, no por el número", () => {
    expect(t.cellText("estatus", rows[1])).toBe("Por Autorizar");
    expect(t.cellText("estatus", rows[3])).toBe("Archivada");
    expect(t.cellText("estatus", rows[4])).toBe("Estatus 8");
    expect(t.column("estatus").meta?.hiddenByDefault).toBe(true);
  });

  test("el cliente por su razón social cruda, como antes de EC-752", () => {
    expect(t.cellText("cliente_razon_social", rows[0])).toBe("ACME SA DE CV");
    // El formato de pantalla (y su respaldo) queda en la celda.
    expect(getQuoteClienteLabel(rows[2])).toBe("Cliente #12");
    expect(getQuoteClienteLabel(rows[1])).toBe("Taller Norte");
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
    expect(buildQuotesCsv([rows[0], rows[5]], visible)).toBe(
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
