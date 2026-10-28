import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { ALL_FILTER_OPTION, type ColumnFilterOption } from "@/src/utils/columnFilterOptions";

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
