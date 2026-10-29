import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters, type HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import {
  ALL_FILTER_OPTION,
  EMPTY_VALUE_FILTER_VALUE,
  type ColumnFilterOption,
} from "@/src/utils/columnFilterOptions";

/**
 * Pruebas unitarias de EC-621: la rama `options` de `withHeaderFilters`
 * (comparación contra el valor crudo, etiqueta de los valores fuera del
 * catálogo y `filterLabel`). Se leen el `filterFn` y las props del
 * `FilterHeader` que arma el encabezado, sin renderizar nada.
 */

interface Row {
  folio: string;
  estatus: number;
  estatus_display: string;
}

const rows: Row[] = [
  { folio: "OP-1", estatus: 1, estatus_display: "Pendiente" },
  { folio: "OP-2", estatus: 2, estatus_display: "Preparacion" },
  { folio: "OP-3", estatus: 9, estatus_display: "En espera" },
];

const catalog: ColumnFilterOption[] = [
  { value: "1", label: "Pendiente" },
  { value: "2", label: "Preparación" },
];

const [column] = withHeaderFilters<Row>(
  [{ accessorKey: "folio", header: "Folio" } as ColumnDef<Row, unknown>],
  rows,
  {
    folio: {
      type: "options",
      filterLabel: "estatus",
      get: (r) => r.estatus,
      options: catalog,
      label: (r) => r.estatus_display,
    },
  },
);

type FilterFn = (row: { original: Row }, columnId: string, filterValue: unknown) => boolean;
const filterFn = column.filterFn as unknown as FilterFn;
const matching = (value: string | undefined) =>
  rows.filter((original) => filterFn({ original }, "folio", value)).map((r) => r.folio);

const headerProps = () => {
  const header = column.header as (context: { column: unknown }) => {
    props: { options: ColumnFilterOption[]; label: string; title: string };
  };
  return header({ column: {} }).props;
};

test.describe("withHeaderFilters › spec options", () => {
  test("compara contra el valor crudo", () => {
    expect(matching("2")).toEqual(["OP-2"]);
    expect(matching("9")).toEqual(["OP-3"]);
  });

  test("sin filtro activo pasan todas las filas", () => {
    expect(matching(undefined)).toEqual(["OP-1", "OP-2", "OP-3"]);
  });

  test("'Todos', el catálogo en su orden y el valor de fuera con la etiqueta de `label`", () => {
    expect(headerProps().options).toEqual([
      ALL_FILTER_OPTION,
      ...catalog,
      { value: "9", label: "En espera" },
    ]);
  });

  test("`label` no reemplaza las etiquetas del catálogo", () => {
    const labels = headerProps().options.map((option) => option.label);
    expect(labels).toContain("Preparación");
    expect(labels).not.toContain("Preparacion");
  });

  test("`filterLabel` llega al embudo y el título sigue siendo el de la columna", () => {
    const props = headerProps();
    expect(props.label).toBe("estatus");
    expect(props.title).toBe("Folio");
  });
});

test.describe("withHeaderFilters › nombre del chip 'Filtrado por' (EC-623)", () => {
  test("con `filterLabel`, el chip lo usa (capitalizado) en `meta.filterLabel`", () => {
    expect(column.meta?.filterLabel).toBe("Estatus");
    expect(column.meta?.label).toBe("Folio");
  });

  test("sin `filterLabel`, la columna no trae `meta.filterLabel` y el chip sigue con su etiqueta", () => {
    const [plain] = withHeaderFilters<Row>(
      [{ accessorKey: "folio", header: "Folio" } as ColumnDef<Row, unknown>],
      rows,
      { folio: { type: "distinct", get: (r) => r.folio } },
    );
    expect(plain.meta?.filterLabel).toBeUndefined();
    expect(plain.meta?.label).toBe("Folio");
  });
});

test.describe("withHeaderFilters › `emptyOption` (EC-635)", () => {
  interface Item {
    id: number;
    area: number | null;
    area_nombre: string | null;
  }
  const items: Item[] = [
    { id: 1, area: 2, area_nombre: "VENTAS" },
    { id: 2, area: null, area_nombre: null },
    { id: 3, area: 1, area_nombre: "COMPRAS" },
  ];
  const build = (spec: HeaderFilterSpec<Item>) => {
    const [col] = withHeaderFilters<Item>(
      [{ accessorKey: "area", header: "Área" } as ColumnDef<Item, unknown>],
      items,
      { area: spec },
    );
    const header = col.header as (context: { column: unknown }) => { props: { options: ColumnFilterOption[] } };
    const filterFn = col.filterFn as unknown as (row: { original: Item }, id: string, value: unknown) => boolean;
    return {
      options: header({ column: {} }).props.options,
      matching: (value: string) => items.filter((original) => filterFn({ original }, "area", value)).map((i) => i.id),
    };
  };

  test("distinct: la opción vacía va fijada PRIMERO, antes de las filas ordenadas, y filtra solo las vacías", () => {
    const t = build({ type: "distinct", get: (r) => r.area, label: (r) => r.area_nombre, emptyOption: "Sin área" });
    expect(t.options).toEqual([
      ALL_FILTER_OPTION,
      { value: EMPTY_VALUE_FILTER_VALUE, label: "Sin área" },
      { value: "1", label: "COMPRAS" },
      { value: "2", label: "VENTAS" },
    ]);
    expect(t.matching(EMPTY_VALUE_FILTER_VALUE)).toEqual([2]);
    expect(t.matching("2")).toEqual([1]);
  });

  test("options: la opción vacía va antes del catálogo", () => {
    const t = build({
      type: "options",
      get: (r) => r.area,
      options: [{ value: "2", label: "Ventas" }],
      emptyOption: "Sin área",
    });
    expect(t.options.map((o) => o.label)).toEqual(["Todos", "Sin área", "Ventas", "1"]);
    expect(t.matching(EMPTY_VALUE_FILTER_VALUE)).toEqual([2]);
  });

  test("sin `emptyOption` nada cambia: las filas vacías no tienen opción", () => {
    const t = build({ type: "distinct", get: (r) => r.area, label: (r) => r.area_nombre });
    expect(t.options.map((o) => o.value)).toEqual([undefined, "1", "2"]);
  });
});
