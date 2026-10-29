import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import {
  employeeHeaderFilter,
  estadoHeaderFilter,
  withHeaderFilters,
  type HeaderFilterSpec,
} from "@/src/components/withHeaderFilters";
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
  const headerFilter = column.meta?.headerFilter;
  if (!headerFilter) throw new Error("sin filtro de encabezado folio");
  return headerFilter;
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
    const filterFn = col.filterFn as unknown as (row: { original: Item }, id: string, value: unknown) => boolean;
    return {
      options: col.meta?.headerFilter?.options ?? [],
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

test.describe("withHeaderFilters › encabezado estable", () => {
  const spec = { folio: { type: "distinct", get: (r: Row) => r.folio } } as const;
  const build = (data: Row[]) =>
    withHeaderFilters<Row>([{ accessorKey: "folio", header: "Folio" } as ColumnDef<Row, unknown>], data, spec)[0];

  test("el mismo componente de encabezado con filas distintas: no se remonta", () => {
    expect(build(rows).header).toBe(build(rows.slice(0, 1)).header);
  });

  test("las opciones se renuevan con las filas, en `meta.headerFilter`", () => {
    expect(build(rows.slice(0, 1)).meta?.headerFilter?.options.map((o) => o.label)).toEqual([
      "Todos",
      rows[0].folio,
    ]);
  });
});

test.describe("employeeHeaderFilter / estadoHeaderFilter", () => {
  type Rec = { id: number; empleado: number; empleado_nombre: string; estado: string };
  const recs: Rec[] = [
    { id: 1, empleado: 7, empleado_nombre: "ANA", estado: "pendiente" },
    { id: 2, empleado: 9, empleado_nombre: "Empleado #9", estado: "rara" },
  ];
  const [emp, est] = withHeaderFilters<Rec>(
    [
      { id: "empleado", header: "Empleado" } as ColumnDef<Rec, unknown>,
      { id: "estado", header: "Estado" } as ColumnDef<Rec, unknown>,
    ],
    recs,
    {
      empleado: employeeHeaderFilter(),
      estado: estadoHeaderFilter([{ value: "pendiente", label: "Pendiente" }]),
    },
  );
  type Fn = (row: { original: Rec }, columnId: string, value: unknown) => boolean;
  const ids = (col: typeof emp, value: string) =>
    recs.filter((original) => (col.filterFn as unknown as Fn)({ original }, "", value)).map((r) => r.id);

  test("empleado: por FK, rotulado con el nombre (o su `#N`), con buscador", () => {
    expect(emp.meta?.headerFilter?.options.map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      ["7", "ANA"],
      ["9", "Empleado #9"],
    ]);
    expect(emp.meta?.headerFilter?.searchable).toEqual({ placeholder: "Buscar empleado…" });
    expect(emp.meta?.filterLabel).toBeUndefined();
    expect(ids(emp, "9")).toEqual([2]);
  });

  test("estado: catálogo y el código desconocido al final, con ficha «Estatus»", () => {
    expect(est.meta?.headerFilter?.options.map((o) => o.label)).toEqual(["Todos", "Pendiente", "rara"]);
    expect(est.meta?.filterLabel).toBe("Estatus");
    expect(ids(est, "pendiente")).toEqual([1]);
  });
});
