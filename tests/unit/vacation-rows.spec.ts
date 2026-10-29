import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import {
  getColumns,
  VACATION_HEADER_FILTERS,
  type VacationRow,
} from "@/src/features/vacations/components/VacationColumns";
import {
  buildVacationRows,
  getVacationStaleNotice,
} from "@/src/features/vacations/utils/vacationRows";
import type { Vacation } from "@/src/features/vacations/interfaces/vacation.interface";

/**
 * Pruebas unitarias de EC-636 sobre el listado de vacaciones: el nombre es el
 * menú y filtra por empleado; el estatus tiene su columna y su filtro; los diálogos de aprobar,
 * rechazar y eliminar se cierran con aviso cuando la solicitud cambia de
 * estado por fuera.
 */

const vacation = (id: number, overrides: Partial<Vacation> = {}): Vacation => ({
  id,
  empleado: 1,
  fecha_inicio: "2026-10-05",
  fecha_fin: "2026-10-09",
  dias_solicitados: 5,
  motivo: null,
  estado: "pendiente",
  solicitado_por: null,
  fecha_solicitud: "2026-09-20T10:00:00Z",
  autorizado_por: null,
  fecha_aprobacion: null,
  rechazado_por: null,
  fecha_rechazo: null,
  motivo_rechazo: null,
  dias_disponibles_al_momento: null,
  ...overrides,
});

const rows = buildVacationRows(
  [
    vacation(1),
    vacation(2, { estado: "aprobado", empleado: 2 }),
    vacation(3, { estado: "rechazado", empleado: 99 }),
    vacation(4, { estado: "cancelado" as Vacation["estado"] }),
  ],
  new Map([
    [1, "ANA PÉREZ"],
    [2, "LUIS GÓMEZ"],
  ]),
  null,
  false,
);

const columns = withHeaderFilters(
  getColumns({ canEdit: false, canApprove: false, canDelete: false }) as ColumnDef<VacationRow, unknown>[],
  rows,
  VACATION_HEADER_FILTERS,
);

const column = (id: string) => {
  const found = columns.find((c) => c.id === id);
  if (!found) throw new Error(`sin columna ${id}`);
  return found;
};

type FilterFn = (row: { original: VacationRow }, columnId: string, filterValue: unknown) => boolean;
const matching = (id: string, value: string | undefined) =>
  rows.filter((original) => (column(id).filterFn as unknown as FilterFn)({ original }, id, value)).map((r) => r.id);

const headerProps = (id: string) => {
  const headerFilter = column(id).meta?.headerFilter;
  if (!headerFilter) throw new Error(`sin filtro de encabezado ${id}`);
  return headerFilter;
};

test.describe("buildVacationRows", () => {
  test("resuelve el empleado y rotula `Empleado #N` al que no está en el catálogo", () => {
    expect(rows.map((r) => r.empleado_nombre)).toEqual(["ANA PÉREZ", "LUIS GÓMEZ", "Empleado #99", "ANA PÉREZ"]);
  });
});

test.describe("vacaciones › filtro de estatus", () => {
  test("Estado en su propia columna, sin Acciones aparte", () => {
    expect(columns.map((c) => c.id)).toEqual(["empleado", "periodo", "dias_solicitados", "estado", "fecha_solicitud"]);
  });

  test("su ficha se titula \"Estatus\" y el embudo lo nombra", () => {
    expect(column("estado").meta?.filterLabel).toBe("Estatus");
    expect(headerProps("estado").label).toBe("estatus");
    expect(headerProps("estado").title).toBe("Estado");
  });

  test("el catálogo completo y al final el código desconocido, crudo", () => {
    expect(headerProps("estado").options.map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      ["pendiente", "Pendiente"],
      ["aprobado", "Aprobada"],
      ["rechazado", "Rechazada"],
      ["cancelado", "cancelado"],
    ]);
  });

  test("filtra por el código crudo del estado", () => {
    expect(matching("estado", "pendiente")).toEqual([1]);
    expect(matching("estado", "aprobado")).toEqual([2]);
    expect(matching("estado", "cancelado")).toEqual([4]);
  });
});

test.describe("vacaciones › filtro de empleado", () => {
  test("opciones de las filas con el mismo `#N` que la celda, con buscador", () => {
    expect(headerProps("empleado").options.map((o) => o.label)).toEqual(["Todos", "ANA PÉREZ", "Empleado #99", "LUIS GÓMEZ"]);
    expect(column("empleado").meta?.filterLabel).toBeUndefined();
  });

  test("filtra por el FK y se combina con el de estatus", () => {
    expect(matching("empleado", "1")).toEqual([1, 4]);
    const both = rows.filter(
      (original) =>
        (column("empleado").filterFn as unknown as FilterFn)({ original }, "empleado", "1") &&
        (column("estado").filterFn as unknown as FilterFn)({ original }, "estado", "pendiente"),
    );
    expect(both.map((r) => r.id)).toEqual([1]);
  });
});

test.describe("vacaciones › cierre de los diálogos de fila", () => {
  test("aprobar/rechazar: sigue abierto mientras la solicitud está pendiente", () => {
    expect(getVacationStaleNotice(1, { estado: "pendiente" }, "pendiente", false)).toBeNull();
  });

  test("aprobar/rechazar: se cierra con aviso si otra persona ya la aprobó", () => {
    expect(getVacationStaleNotice(1, { estado: "aprobado" }, "pendiente", false)).toEqual({
      key: "vacation-stale-1-aprobado",
      message: "La solicitud cambió de estado: ya está aprobada. Se actualizó el listado.",
    });
  });

  test("se cierra con aviso si la solicitud ya no existe", () => {
    expect(getVacationStaleNotice(1, null, "pendiente", false)).toEqual({
      key: "vacation-stale-1-gone",
      message: "La solicitud ya no existe. Se actualizó el listado.",
    });
  });

  test("con la acción propia en vuelo no avisa, aunque el refetch ya la muestre rechazada", () => {
    expect(getVacationStaleNotice(1, { estado: "rechazado" }, "pendiente", true)).toBeNull();
  });

  test("eliminar: compara contra el estado de APERTURA", () => {
    expect(getVacationStaleNotice(2, { estado: "aprobado" }, "aprobado", false)).toBeNull();
    expect(getVacationStaleNotice(2, { estado: "pendiente" }, "aprobado", false)?.key).toBe(
      "vacation-stale-2-pendiente",
    );
  });
});
