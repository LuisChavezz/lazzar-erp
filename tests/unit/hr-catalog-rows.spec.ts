import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { harness } from "./support/headerFilterHarness";
import { EMPTY_VALUE_FILTER_VALUE } from "@/src/utils/columnFilterOptions";
import { AREA_HEADER_FILTERS, getColumns as getAreaColumns, type AreaRow } from "@/src/features/areas/components/AreaColumns";
import { buildAreaRows } from "@/src/features/areas/utils/areaRows";
import {
  POSITION_HEADER_FILTERS,
  getColumns as getPositionColumns,
  type PositionRow,
} from "@/src/features/positions/components/PositionColumns";
import { buildPositionRows } from "@/src/features/positions/utils/positionRows";
import { SHIFT_HEADER_FILTERS, getColumns as getShiftColumns } from "@/src/features/shifts/components/ShiftColumns";
import {
  CALENDAR_HEADER_FILTERS,
  getColumns as getCalendarColumns,
  type CalendarRow,
} from "@/src/features/calendars/components/CalendarColumns";
import { buildCalendarRows } from "@/src/features/calendars/utils/calendarRows";
import type { Area } from "@/src/features/areas/interfaces/area.interface";
import type { Position } from "@/src/features/positions/interfaces/position.interface";
import type { Shift } from "@/src/features/shifts/interfaces/shift.interface";
import type { Calendar } from "@/src/features/calendars/interfaces/calendar.interface";

/**
 * Pruebas unitarias de EC-635 sobre los catálogos de RH (áreas, puestos,
 * turnos, calendarios): el rótulo `#N` de un FK fuera de catálogo, que la celda
 * y la opción de su filtro leen igual, y las opciones de cada filtro de
 * encabezado. Se leen el `filterFn`, el accessor y las props del
 * `FilterHeader`, sin renderizar nada.
 */

const NO_PERMISSIONS = { canEdit: false, canDelete: false };

test.describe("áreas", () => {
  const rows = buildAreaRows(
    [
      { id: 1, departamento: 1, nombre: "CORTE", codigo: null, responsable: null, descripcion: null, activo: true },
      { id: 2, departamento: 7, nombre: "BORDADO", codigo: null, responsable: null, descripcion: null, activo: false },
    ] as Area[],
    new Map([[1, "PRODUCCIÓN"]]),
  );
  const t = harness<AreaRow>(
    withHeaderFilters(getAreaColumns(NO_PERMISSIONS) as ColumnDef<AreaRow, unknown>[], rows, AREA_HEADER_FILTERS),
    rows,
  );

  test("rotula `Departamento #N` y la celda coincide con la opción del filtro", () => {
    expect(rows[1].departamento_nombre).toBe("Departamento #7");
    expect(t.options("departamento").find((o) => o.value === "7")?.label).toBe(t.cellText("departamento", rows[1]));
  });

  test("el nombre filtra por `activo`, con ficha \"Estatus\"", () => {
    expect(t.matching("nombre", "no").map((r) => r.id)).toEqual([2]);
    expect(t.column("nombre").meta?.filterLabel).toBe("Estatus");
  });
});

test.describe("puestos", () => {
  const rows = buildPositionRows(
    [
      { id: 1, empresa: 1, nombre: "SUPERVISOR", descripcion: null, salario_base: "1.00", area: 1, activo: true },
      { id: 2, empresa: 1, nombre: "AYUDANTE", descripcion: null, salario_base: null, area: null, activo: true },
      { id: 3, empresa: 1, nombre: "CORTADOR", descripcion: null, salario_base: null, area: 42, activo: true },
    ] as Position[],
    new Map([[1, "CORTE"]]),
  );
  const t = harness<PositionRow>(
    withHeaderFilters(getPositionColumns(NO_PERMISSIONS) as ColumnDef<PositionRow, unknown>[], rows, POSITION_HEADER_FILTERS),
    rows,
  );

  test("sin área queda `null` (celda \"—\"); un área fuera de catálogo, `Área #N`", () => {
    expect(rows.map((r) => r.area_nombre)).toEqual(["CORTE", null, "Área #42"]);
    expect(t.cellText("area", rows[1])).toBe("—");
    expect(t.options("area").find((o) => o.value === "42")?.label).toBe(t.cellText("area", rows[2]));
  });

  test("los puestos sin área tienen su propia opción, fijada primero, y su filtro los encuentra", () => {
    expect(t.options("area")[1]).toEqual({ value: EMPTY_VALUE_FILTER_VALUE, label: "Sin área" });
    expect(t.matching("area", EMPTY_VALUE_FILTER_VALUE).map((r) => r.id)).toEqual([2]);
  });
});

test.describe("turnos", () => {
  const shift = (id: number, hora_entrada: string, dias_laborales: string | null): Shift =>
    ({ id, nombre: `T${id}`, hora_entrada, hora_salida: "17:00:00", dias_laborales, activo: true }) as Shift;
  const rows = [shift(1, "08:00:00", "L,M,X,J,V"), shift(2, "07:00:00", "L,M,M,J,V"), shift(3, "08:00:00.123456", null)];
  const t = harness<Shift>(
    withHeaderFilters(getShiftColumns(NO_PERMISSIONS) as ColumnDef<Shift, unknown>[], rows, SHIFT_HEADER_FILTERS),
    rows,
  );

  test("la entrada ofrece cada hora `HH:MM` de las filas, en orden y sin segundos", () => {
    expect(t.options("hora_entrada").map((o) => o.label)).toEqual(["Todos", "07:00", "08:00"]);
    expect(t.matching("hora_entrada", "08:00").map((r) => r.id)).toEqual([1, 3]);
  });

  test("los días filtran por la cadena guardada: un valor heredado es otra opción", () => {
    expect(t.options("dias_laborales").map((o) => o.value)).toEqual([
      undefined,
      EMPTY_VALUE_FILTER_VALUE,
      "L,M,M,J,V",
      "L,M,X,J,V",
    ]);
  });

  test("\"Sin días\" va fijada primero y encuentra los turnos sin días", () => {
    expect(t.options("dias_laborales")[1].label).toBe("Sin días");
    expect(t.matching("dias_laborales", EMPTY_VALUE_FILTER_VALUE).map((r) => r.id)).toEqual([3]);
  });
});

test.describe("calendarios", () => {
  const rows = buildCalendarRows(
    [
      { id: 1, fecha: "2026-01-01", tipo: "festivo", turno: 1 },
      { id: 2, fecha: "2026-01-02", tipo: "", turno: 5 },
      { id: 3, fecha: "2026-02-03", tipo: "puente" as Calendar["tipo"], turno: 1 },
      { id: 4, fecha: "2026-02-04", tipo: null, turno: 1 },
    ] as Calendar[],
    new Map([[1, "MATUTINO"]]),
  );
  const t = harness<CalendarRow>(
    withHeaderFilters(getCalendarColumns(NO_PERMISSIONS) as ColumnDef<CalendarRow, unknown>[], rows, CALENDAR_HEADER_FILTERS),
    rows,
  );

  test("rotula `Turno #N` y la celda coincide con la opción del filtro", () => {
    expect(rows[1].turno_nombre).toBe("Turno #5");
    expect(t.options("turno").find((o) => o.value === "5")?.label).toBe(t.cellText("turno", rows[1]));
  });

  test("tipo: catálogo completo con \"Sin tipo\" y al final el código desconocido, crudo como su celda", () => {
    expect(t.options("tipo").map((o) => [o.value, o.label])).toEqual([
      [undefined, "Todos"],
      [EMPTY_VALUE_FILTER_VALUE, "Sin tipo"],
      ["laborable", "Laborable"],
      ["descanso", "Descanso"],
      ["festivo", "Festivo"],
      ["vacaciones", "Vacaciones"],
      ["puente", "puente"],
    ]);
    expect(t.cellText("tipo", rows[2])).toBe("puente");
  });

  test("\"Sin tipo\" encuentra los días con tipo vacío o nulo", () => {
    expect(t.matching("tipo", EMPTY_VALUE_FILTER_VALUE).map((r) => r.id)).toEqual([2, 4]);
    expect(t.cellText("tipo", rows[3])).toBe("—");
  });

  test("la fecha filtra por mes", () => {
    expect(t.matching("fecha", "2026-02").map((r) => r.id)).toEqual([3, 4]);
  });
});
