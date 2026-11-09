import { expect, test } from "@playwright/test";
import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  type ColumnFiltersState,
  type TableState,
} from "@tanstack/react-table";
import {
  buildOperationsQuoteFilterOptions,
  getOperationsQuoteColumns,
  getOperationsQuoteSearchText,
} from "@/src/features/operations/components/OperationsQuoteColumns";
import type { OperationsQuote } from "@/src/features/operations/interfaces/operations-quote.interface";
import { rowSearchTextTableOptions } from "@/src/utils/rowSearchText";

/**
 * Lista de cotizaciones de Mesa de Control (EC-810): la búsqueda en memoria
 * (texto por fila de `DataTable`) y el filtro de cliente por id. Se arma la
 * tabla de TanStack con las MISMAS columnas y opciones que usa `DataTable`.
 */

const quote = (overrides: Partial<OperationsQuote>): OperationsQuote =>
  ({
    id: 1,
    estatus: 2,
    estatus_label: "EN REVISION",
    cliente: 10,
    cliente_razon_social: "ABARROTES ABEJA, SA DE CV",
    cliente_nombre: "GERARDO GOMEZ",
    piezas: 10,
    created_at: "2026-11-02T12:29:00-06:00",
    vendedor_nombre: "RAMON BECERRA LAZARO",
    codigo_postal: null,
    importe_sin_iva: 1000,
    moneda_codigo: "MXN",
    ...overrides,
  }) as OperationsQuote;

const ROWS: OperationsQuote[] = [
  quote({ id: 295, cliente: 115, cliente_razon_social: "LAZZAR", cliente_nombre: "JESUS" }),
  quote({ id: 296, cliente: 21, cliente_razon_social: "LAZZAR", cliente_nombre: "ADRIAN" }),
  quote({ id: 1850, cliente: 100, cliente_razon_social: "COMPAÑIA SCOULAR DE MEXICO", cliente_nombre: "GABRIELA HERNANDEZ", vendedor_nombre: null }),
  quote({ id: 1869, cliente: null, cliente_razon_social: null, cliente_nombre: null }),
];

/** Ids de las filas que deja la tabla con esa búsqueda y esos filtros de columna. */
const visibleIds = (globalFilter: string, columnFilters: ColumnFiltersState = []) => {
  const state = { globalFilter, columnFilters } as Partial<TableState> as TableState;
  const table = createTable<OperationsQuote>({
    data: ROWS,
    columns: getOperationsQuoteColumns(buildOperationsQuoteFilterOptions(ROWS)),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state,
    onStateChange: () => {},
    renderFallbackValue: null,
    ...rowSearchTextTableOptions(getOperationsQuoteSearchText),
  });
  table.setOptions((prev) => ({ ...prev, state: { ...table.initialState, ...state } }));
  return table.getFilteredRowModel().rows.map((row) => row.original.id);
};

test.describe("búsqueda de la lista de Mesa de Control", () => {
  test("encuentra por el contacto, que ninguna columna muestra", () => {
    expect(visibleIds("jesus")).toEqual([295]);
    expect(visibleIds("Gabriela")).toEqual([1850]);
  });

  test("sigue encontrando por lo de siempre: folio, razón social y vendedor", () => {
    expect(visibleIds("#00295")).toEqual([295]);
    expect(visibleIds("lazzar")).toEqual([295, 296]);
    expect(visibleIds("ramon")).toEqual([295, 296, 1869]);
  });

  test("no empata a caballo entre dos campos y tolera una fila sin cliente", () => {
    expect(visibleIds("LAZZAR JESUS")).toEqual([]);
    expect(getOperationsQuoteSearchText(ROWS[3])).not.toMatch(/null|undefined/);
  });
});

test.describe("filtro de cliente de la lista de Mesa de Control", () => {
  test("una opción por id: los dos LAZZAR por separado y Sin cliente", () => {
    expect(buildOperationsQuoteFilterOptions(ROWS).clientes).toEqual([
      { value: undefined, label: "Todos" },
      { value: "sin_cliente", label: "Sin cliente" },
      { value: "100", label: "COMPAÑIA SCOULAR DE MEXICO" },
      { value: "21", label: "LAZZAR (cliente #21)" },
      { value: "115", label: "LAZZAR (cliente #115)" },
    ]);
  });

  test("filtra por el id del cliente, no por el texto", () => {
    expect(visibleIds("", [{ id: "cliente_razon_social", value: "21" }])).toEqual([296]);
    expect(visibleIds("", [{ id: "cliente_razon_social", value: "115" }])).toEqual([295]);
    expect(visibleIds("", [{ id: "cliente_razon_social", value: "sin_cliente" }])).toEqual([1869]);
  });
});
