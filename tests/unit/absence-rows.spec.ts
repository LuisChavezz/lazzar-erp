import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import type { ColumnFilterOption } from "@/src/utils/columnFilterOptions";
import {
  ABSENCE_HEADER_FILTERS,
  getColumns,
  type AbsenceRow,
} from "@/src/features/absences/components/AbsenceColumns";
import {
  buildAbsenceRows,
  getAbsenceStaleNotice,
  getAbsenceTipoText,
} from "@/src/features/absences/utils/absenceRows";
import type { Absence } from "@/src/features/absences/interfaces/absence.interface";

/**
 * Pruebas unitarias de EC-636 sobre permisos y ausencias: el filtro de
 * empleado, el de estatus (cuya etiqueta depende del tipo), el goce de sueldo como filtro
 * propio y el cierre con aviso de los diálogos de resolver.
 */

const absence = (id: number, overrides: Partial<Absence> = {}): Absence => ({
  id,
  empleado: 1,
  tipo: "permiso",
  fecha_inicio: "2026-10-05",
  fecha_fin: "2026-10-05",
  con_goce_sueldo: true,
  motivo: "",
  estado: "pendiente",
  solicitado_por: null,
  fecha_solicitud: "2026-10-01T10:00:00Z",
  autorizado_por: null,
  fecha_aprobacion: null,
  rechazado_por: null,
  fecha_rechazo: null,
  motivo_rechazo: null,
  ...overrides,
});

const rows = buildAbsenceRows(
  [
    absence(1),
    absence(2, { tipo: "falta_injustificada", estado: "aprobado", con_goce_sueldo: false }),
    absence(3, { tipo: "incapacidad", estado: "rechazado", con_goce_sueldo: false, empleado: 99 }),
    absence(4, { estado: "en_revision" as Absence["estado"], tipo: "comision" as Absence["tipo"] }),
  ],
  new Map([[1, "ANA PÉREZ"]]),
  null,
  false,
);

const columns = withHeaderFilters(
  getColumns({ canEdit: false, canApprove: false, canDelete: false }) as ColumnDef<AbsenceRow, unknown>[],
  rows,
  ABSENCE_HEADER_FILTERS,
);

const column = (id: string) => {
  const found = columns.find((c) => c.id === id);
  if (!found) throw new Error(`sin columna ${id}`);
  return found;
};

type FilterFn = (row: { original: AbsenceRow }, columnId: string, filterValue: unknown) => boolean;
const matching = (id: string, value: string | undefined) =>
  rows.filter((original) => (column(id).filterFn as unknown as FilterFn)({ original }, id, value)).map((r) => r.id);

const headerProps = (id: string) => {
  const header = column(id).header as (context: { column: unknown }) => {
    props: { options: ColumnFilterOption[]; label: string; title: string };
  };
  return header({ column: {} }).props;
};

test.describe("ausencias › filtro de estatus", () => {
  test("Estado en su propia columna, sin Acciones aparte", () => {
    expect(columns.map((c) => c.id)).toEqual(["empleado", "tipo", "periodo", "con_goce_sueldo", "estado", "fecha_solicitud"]);
  });

  test("usa las opciones que nombran las dos variantes del tipo, y el código desconocido al final, crudo", () => {
    expect(column("estado").meta?.filterLabel).toBe("Estatus");
    expect(headerProps("estado").options.map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      ["pendiente", "Pendiente"],
      ["aprobado", "Aprobado / falta confirmada"],
      ["rechazado", "Rechazado / descartado"],
      ["en_revision", "en_revision"],
    ]);
  });

  test("una falta confirmada entra en «aprobado»: filtra por el código crudo, no por la etiqueta del badge", () => {
    expect(matching("estado", "aprobado")).toEqual([2]);
    expect(matching("estado", "rechazado")).toEqual([3]);
    expect(matching("estado", "en_revision")).toEqual([4]);
  });
});

test.describe("ausencias › filtro de empleado", () => {
  test("opciones de las filas con el mismo `#N` que la celda, con buscador", () => {
    expect(headerProps("empleado").options.map((o) => o.label)).toEqual(["Todos", "ANA PÉREZ", "Empleado #99"]);
    expect(column("empleado").meta?.filterLabel).toBeUndefined();
  });

  test("filtra por el FK y se combina con el de estatus", () => {
    expect(matching("empleado", "1")).toEqual([1, 2, 4]);
    const both = rows.filter(
      (original) =>
        (column("empleado").filterFn as unknown as FilterFn)({ original }, "empleado", "1") &&
        (column("estado").filterFn as unknown as FilterFn)({ original }, "estado", "aprobado"),
    );
    expect(both.map((r) => r.id)).toEqual([2]);
  });
});

test.describe("ausencias › goce de sueldo y tipo", () => {
  test("el goce es un filtro booleano propio, independiente del estado", () => {
    expect(headerProps("con_goce_sueldo").options.map((o) => o.label)).toEqual(["Todos", "Con goce", "Sin goce"]);
    expect(matching("con_goce_sueldo", "si")).toEqual([1, 4]);
    expect(matching("con_goce_sueldo", "no")).toEqual([2, 3]);
  });

  test("tipo: catálogo completo y el código desconocido al final, crudo como su celda", () => {
    expect(headerProps("tipo").options.map((o) => o.label)).toEqual([
      "Todos",
      "Permiso",
      "Incapacidad",
      "Falta injustificada",
      "comision",
    ]);
    expect(getAbsenceTipoText("comision")).toBe("comision");
    expect(matching("tipo", "comision")).toEqual([4]);
  });

  test("el empleado fuera del catálogo se rotula `Empleado #N`", () => {
    expect(rows[2].empleado_nombre).toBe("Empleado #99");
  });
});

test.describe("ausencias › cierre de los diálogos de resolver", () => {
  test("sigue abierto mientras está pendiente", () => {
    expect(getAbsenceStaleNotice(1, { tipo: "permiso", estado: "pendiente" }, "pendiente", false)).toBeNull();
  });

  test("una falta que otra persona confirmó: aviso con la etiqueta de su tipo", () => {
    expect(getAbsenceStaleNotice(2, { tipo: "falta_injustificada", estado: "aprobado" }, "pendiente", false)).toEqual({
      key: "absence-stale-2-aprobado",
      message: "El registro cambió de estado (ahora: «Falta confirmada»). Se actualizó el listado.",
    });
  });

  test("ya no existe: aviso de inexistente", () => {
    expect(getAbsenceStaleNotice(5, null, "pendiente", false)).toEqual({
      key: "absence-stale-5-gone",
      message: "El registro ya no existe. Se actualizó el listado.",
    });
  });

  test("con la acción propia en vuelo no avisa", () => {
    expect(getAbsenceStaleNotice(1, { tipo: "permiso", estado: "rechazado" }, "pendiente", true)).toBeNull();
  });
});
