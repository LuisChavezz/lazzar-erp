import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import {
  getColumns,
  PRODUCTIVITY_HEADER_FILTERS,
  type ProductivityRow,
} from "@/src/features/productivity/components/ProductivityColumns";
import {
  buildProductivityRows,
  getProductivityStaleNotice,
} from "@/src/features/productivity/utils/productivityRows";
import type { Productivity } from "@/src/features/productivity/interfaces/productivity.interface";

/**
 * Pruebas unitarias de EC-636 sobre productividad: estatus en su columna con
 * su filtro, empleado, departamento y unidad con opciones de las filas (respaldo `#N`
 * compartido con la celda) y el cierre con aviso de confirmar / devolver /
 * eliminar.
 */

const record = (id: number, overrides: Partial<Productivity> = {}): Productivity => ({
  id,
  empresa: 1,
  departamento: 10,
  empleado: 1,
  estado: "borrador",
  creado_por: null,
  fecha: "2026-10-05",
  meta: "100.00",
  meta_unidad: 5,
  resultado: "90.00",
  descripcion: null,
  ...overrides,
});

const rows = buildProductivityRows(
  [
    record(1),
    record(2, { estado: "confirmado", departamento: 77, meta_unidad: 8 }),
    record(3, { estado: "archivado" as Productivity["estado"] }),
  ],
  new Map([[1, "ANA PÉREZ"]]),
  new Map([[10, "PRODUCCIÓN"]]),
  new Map([[5, "PIEZAS"]]),
);

const columns = withHeaderFilters(
  getColumns({ canEdit: false, canDelete: false }) as ColumnDef<ProductivityRow, unknown>[],
  rows,
  PRODUCTIVITY_HEADER_FILTERS,
);

const column = (id: string) => {
  const found = columns.find((c) => c.id === id);
  if (!found) throw new Error(`sin columna ${id}`);
  return found;
};

type FilterFn = (row: { original: ProductivityRow }, columnId: string, filterValue: unknown) => boolean;
const matching = (id: string, value: string | undefined) =>
  rows.filter((original) => (column(id).filterFn as unknown as FilterFn)({ original }, id, value)).map((r) => r.id);

const headerProps = (id: string) => {
  const headerFilter = column(id).meta?.headerFilter;
  if (!headerFilter) throw new Error(`sin filtro de encabezado ${id}`);
  return headerFilter;
};

test.describe("productividad › columnas y filtros", () => {
  test("el empleado es la primera columna y Estado la última, sin Acciones aparte", () => {
    expect(columns[0].id).toBe("empleado");
    expect(columns.at(-1)?.id).toBe("estado");
    expect(columns.map((c) => c.id)).not.toContain("actions");
  });

  test("estatus: catálogo completo y el código desconocido al final, crudo", () => {
    expect(column("estado").meta?.filterLabel).toBe("Estatus");
    expect(headerProps("estado").options.map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      ["borrador", "Borrador"],
      ["confirmado", "Confirmado"],
      ["archivado", "archivado"],
    ]);
    expect(matching("estado", "confirmado")).toEqual([2]);
  });

  test("departamento y unidad: opciones de las filas con el mismo `#N` que la celda", () => {
    expect(headerProps("departamento_nombre").options.map((o) => o.label)).toEqual([
      "Todos",
      "Departamento #77",
      "PRODUCCIÓN",
    ]);
    expect(headerProps("unidad_nombre").options.map((o) => o.label)).toEqual(["Todos", "PIEZAS", "Unidad #8"]);
    expect(matching("departamento_nombre", "77")).toEqual([2]);
  });
});

test.describe("productividad › filtro de empleado", () => {
  test("opciones de las filas con el mismo `#N` que la celda, con buscador", () => {
    expect(headerProps("empleado").options.map((o) => o.label)).toEqual(["Todos", "ANA PÉREZ"]);
    expect(column("empleado").meta?.filterLabel).toBeUndefined();
  });

  test("filtra por el FK y se combina con el de estatus", () => {
    expect(matching("empleado", "1")).toEqual([1, 2, 3]);
    const both = rows.filter(
      (original) =>
        (column("empleado").filterFn as unknown as FilterFn)({ original }, "empleado", "1") &&
        (column("estado").filterFn as unknown as FilterFn)({ original }, "estado", "confirmado"),
    );
    expect(both.map((r) => r.id)).toEqual([2]);
  });
});

test.describe("productividad › cierre de los diálogos de fila", () => {
  test("confirmar: sigue abierto mientras está en borrador", () => {
    expect(getProductivityStaleNotice(1, { estado: "borrador" }, "borrador", false)).toBeNull();
  });

  test("otra persona lo confirmó: aviso con el estado nuevo", () => {
    expect(getProductivityStaleNotice(1, { estado: "confirmado" }, "borrador", false)).toEqual({
      key: "productivity-stale-1-confirmado",
      message: "El registro cambió de estado (ahora: «Confirmado»). Se actualizó el listado.",
    });
  });

  test("devolver a borrador espera un confirmado", () => {
    expect(getProductivityStaleNotice(2, { estado: "confirmado" }, "confirmado", false)).toBeNull();
    expect(getProductivityStaleNotice(2, { estado: "borrador" }, "confirmado", false)?.key).toBe(
      "productivity-stale-2-borrador",
    );
  });

  test("con el PATCH propio ya enviado no avisa", () => {
    expect(getProductivityStaleNotice(1, { estado: "confirmado" }, "borrador", true)).toBeNull();
  });
});
