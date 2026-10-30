import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { employeeHeaderFilter, withHeaderFilters } from "@/src/components/withHeaderFilters";
import { getInactiveEmployeeLookup } from "@/src/features/employees/utils/inactiveEmployees";

/**
 * El filtro de empleado compartido por las páginas de RH: con el catálogo de
 * empleados, marca " (inactivo)" en la opción de un dado de baja (un homónimo
 * activo queda distinguible), pero sigue filtrando por el id.
 */

type Row = { id: number; empleado: number; empleado_nombre: string };

const rows: Row[] = [
  { id: 1, empleado: 1, empleado_nombre: "ANA PÉREZ" },
  { id: 2, empleado: 2, empleado_nombre: "ANA PÉREZ" },
  { id: 3, empleado: 3, empleado_nombre: "LUIS GÓMEZ" },
];

const isInactive = getInactiveEmployeeLookup([
  { id: 1, activo: true },
  { id: 2, activo: false },
  { id: 3, activo: true },
]);

const column = (spec: ReturnType<typeof employeeHeaderFilter<Row>>) =>
  withHeaderFilters([{ id: "empleado", header: "Empleado" }] as ColumnDef<Row, unknown>[], rows, { empleado: spec })[0];

type FilterFn = (row: { original: Row }, columnId: string, filterValue: unknown) => boolean;

test.describe("employeeHeaderFilter", () => {
  test("sin catálogo, las opciones son los nombres tal cual (como antes)", () => {
    expect(column(employeeHeaderFilter()).meta?.headerFilter?.options.map((o) => o.label)).toEqual([
      "Todos",
      "ANA PÉREZ",
      "ANA PÉREZ",
      "LUIS GÓMEZ",
    ]);
  });

  test("con el catálogo, el inactivo lleva \" (inactivo)\" y se distingue del homónimo activo", () => {
    const options = column(employeeHeaderFilter(isInactive)).meta?.headerFilter?.options ?? [];
    expect(options.map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      ["1", "ANA PÉREZ"],
      ["2", "ANA PÉREZ (inactivo)"],
      ["3", "LUIS GÓMEZ"],
    ]);
  });

  test("sigue filtrando por el id", () => {
    const filterFn = column(employeeHeaderFilter(isInactive)).filterFn as unknown as FilterFn;
    expect(rows.filter((original) => filterFn({ original }, "empleado", "2")).map((r) => r.id)).toEqual([2]);
  });

  test("un id fuera del catálogo no se marca", () => {
    expect(isInactive(99)).toBe(false);
  });
});
