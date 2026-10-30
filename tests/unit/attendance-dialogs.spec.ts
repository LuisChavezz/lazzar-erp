import { expect, test } from "@playwright/test";
import type { ColumnDef } from "@tanstack/react-table";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import {
  getHistoryColumns,
  HISTORY_HEADER_FILTERS,
} from "@/src/features/attendance/components/AttendanceColumns";
import {
  getRollCallColumns,
  ROLL_CALL_HEADER_FILTERS,
} from "@/src/features/attendance/components/RollCallColumns";
import {
  buildAttendanceRows,
  buildRollCallRows,
  type AttendanceRow,
  type RollCallRow,
} from "@/src/features/attendance/utils/attendanceRows";
import {
  CHECK_IN_STALE_MESSAGE,
  checkInApplies,
  getStaleAttendanceRecordNotice,
  getStaleCheckInNotice,
} from "@/src/features/attendance/utils/attendanceStaleDialogs";
import type { Attendance } from "@/src/features/attendance/interfaces/attendance.interface";
import type { Employee } from "@/src/features/employees/interfaces/employee.interface";

/**
 * Pruebas unitarias de EC-637 sobre Asistencia: el nombre del empleado es el
 * menú y filtra por empleado en las dos pestañas; el estado tiene su columna y
 * su filtro ("Sin registro" incluido en el pase de lista); y las reglas puras
 * de cierre de los diálogos (registro existente y checada con hora), que
 * resuelven contra el listado COMPLETO: una fila que solo sale de la vista
 * filtrada no cierra nada.
 */

const FECHA = "2026-10-29";

const employee = (id: number, nombre: string): Employee =>
  ({
    id,
    nombre,
    apellido_paterno: "",
    apellido_materno: "",
    numero_empleado: `E-${id}`,
    activo: true,
    turno: null,
  }) as unknown as Employee;

const record = (id: number, overrides: Partial<Attendance> = {}): Attendance => ({
  id,
  fecha: FECHA,
  hora_entrada: "2026-10-29T09:00:00-06:00",
  hora_salida: null,
  estado: "puntual",
  observaciones: null,
  minutos_retardo: 0,
  minutos_tolerancia: 10,
  horas_normales: null,
  horas_extra: null,
  empleado: 1,
  turno: 1,
  autorizado_por: null,
  ...overrides,
});

const catalogs = {
  employees: [employee(1, "ANA"), employee(2, "LUIS"), employee(3, "MARTA")],
  employeesLoaded: true,
  shifts: [],
  shiftsLoaded: true,
};

const records = [
  record(10),
  record(11, { empleado: 2, estado: "retardo", minutos_retardo: 15 }),
  record(12, { empleado: 9, estado: "ausente" as Attendance["estado"] }),
];

type FilterFn<T> = (row: { original: T }, columnId: string, filterValue: unknown) => boolean;

const helpers = <T,>(columns: ColumnDef<T, unknown>[], rows: T[]) => {
  const column = (id: string) => {
    const found = columns.find((c) => c.id === id);
    if (!found) throw new Error(`sin columna ${id}`);
    return found;
  };
  return {
    ids: columns.map((c) => c.id),
    column,
    matching: (id: string, value: string | undefined) =>
      rows.filter((original) => (column(id).filterFn as unknown as FilterFn<T>)({ original }, id, value)),
    options: (id: string) => column(id).meta?.headerFilter?.options.map((o) => [o.value, o.label]),
  };
};

test.describe("asistencia › pase de lista", () => {
  const { rows } = buildRollCallRows(records, catalogs, FECHA, true);
  const roll = helpers(
    withHeaderFilters(
      getRollCallColumns({ canCapture: false, canManage: false }) as ColumnDef<RollCallRow, unknown>[],
      rows,
      ROLL_CALL_HEADER_FILTERS,
    ),
    rows,
  );

  test("el empleado es la primera columna; Estado en la suya, sin Acciones aparte", () => {
    expect(roll.ids[0]).toBe("empleado");
    expect(roll.ids).toContain("estado");
    expect(roll.ids).not.toContain("actions");
  });

  test("el estado ofrece primero «Sin registro», luego el catálogo y el código desconocido, crudo", () => {
    expect(roll.options("estado")).toEqual([
      [undefined, "Todos"],
      ["sin_registro", "Sin registro"],
      ["puntual", "Puntual"],
      ["retardo", "Retardo"],
      ["falta", "Falta"],
      ["justificada", "Justificada"],
      ["ausente", "ausente"],
    ]);
    expect(roll.column("estado").meta?.filterLabel).toBe("Estatus");
  });

  test("filtra por estado, incluido quien aún no checa, y por empleado", () => {
    expect(roll.matching("estado", "sin_registro").map((r) => r.empleado)).toEqual([3]);
    expect(roll.matching("estado", "retardo").map((r) => r.empleado)).toEqual([2]);
    expect(roll.matching("empleado", "9").map((r) => r.empleado_nombre)).toEqual(["Empleado #9"]);
  });
});

test.describe("asistencia › historial", () => {
  const rows = buildAttendanceRows(records, catalogs);
  const history = helpers(
    withHeaderFilters(
      getHistoryColumns({ canCapture: false, canManage: false }) as ColumnDef<AttendanceRow, unknown>[],
      rows,
      HISTORY_HEADER_FILTERS,
    ),
    rows,
  );

  test("el empleado es la primera columna, con su filtro; sin Acciones aparte", () => {
    expect(history.ids.slice(0, 2)).toEqual(["empleado", "fecha"]);
    expect(history.ids).not.toContain("actions");
    expect(history.options("empleado")).toEqual([
      [undefined, "Todos"],
      ["1", "ANA"],
      ["9", "Empleado #9"],
      ["2", "LUIS"],
    ]);
  });

  test("el estado filtra por el código crudo, sin «Sin registro» (todo registro existe)", () => {
    expect(history.options("estado")?.map(([, label]) => label)).toEqual([
      "Todos",
      "Puntual",
      "Retardo",
      "Falta",
      "Justificada",
      "ausente",
    ]);
    expect(history.matching("estado", "puntual").map((r) => r.id)).toEqual([10]);
  });
});

test.describe("asistencia › cierre de los diálogos sobre un registro", () => {
  const [row] = buildAttendanceRows([record(10, { estado: "falta", hora_entrada: null })], catalogs);

  test("corregir, eliminar, desglose: siguen abiertos mientras el registro exista", () => {
    expect(
      getStaleAttendanceRecordNotice({ targetId: 10, target: { ...row, estado: "justificada" }, isBusy: false, canResolve: true }),
    ).toBeNull();
  });

  test("se cierran con aviso si otra persona borró el registro", () => {
    expect(getStaleAttendanceRecordNotice({ targetId: 10, target: null, isBusy: false, canResolve: true })).toEqual({
      key: "attendance-stale-10-gone",
      message: "El registro de asistencia ya no existe. Se actualizó el listado.",
    });
  });

  test("no deciden nada mientras el listado no es del día/periodo actual ni con la mutación propia en vuelo", () => {
    expect(getStaleAttendanceRecordNotice({ targetId: 10, target: null, isBusy: false, canResolve: false })).toBeNull();
    expect(getStaleAttendanceRecordNotice({ targetId: 10, target: null, isBusy: true, canResolve: true })).toBeNull();
  });

  test("justificar: compara contra el estado de APERTURA", () => {
    expect(
      getStaleAttendanceRecordNotice({ targetId: 10, target: row, expectedEstado: "falta", isBusy: false, canResolve: true }),
    ).toBeNull();
    expect(
      getStaleAttendanceRecordNotice({
        targetId: 10,
        target: { ...row, estado: "justificada" },
        expectedEstado: "falta",
        isBusy: false,
        canResolve: true,
      }),
    ).toEqual({
      key: "attendance-stale-10-justificada",
      message: "El registro cambió de estado (ahora: «Justificada»). Se actualizó el listado.",
    });
  });
});

test.describe("asistencia › cierre de la checada con hora", () => {
  const { rows } = buildRollCallRows(records, catalogs, FECHA, true);
  const byEmpleado = (empleado: number) => rows.find((r) => r.empleado === empleado) ?? null;

  test("checkInApplies: entrada sin registro; salida con entrada y sin salida", () => {
    expect(checkInApplies("entrada", byEmpleado(3))).toBe(true);
    expect(checkInApplies("entrada", byEmpleado(1))).toBe(false);
    expect(checkInApplies("salida", byEmpleado(1))).toBe(true);
    expect(checkInApplies("salida", byEmpleado(3))).toBe(false);
    expect(checkInApplies("entrada", null)).toBe(false);
  });

  test("sigue abierta mientras la checada aplique, aunque la fila salga de la vista filtrada", () => {
    // El empleado 3 ("Sin registro") sigue en el pase de lista completo: un
    // filtro de estado en la tabla no lo saca de `rows`.
    expect(
      getStaleCheckInNotice({ kind: "entrada", empleado: 3, row: byEmpleado(3), isBusy: false, canResolve: true }),
    ).toBeNull();
  });

  test("se cierra con aviso si otra persona ya registró la entrada", () => {
    expect(
      getStaleCheckInNotice({ kind: "entrada", empleado: 1, row: byEmpleado(1), isBusy: false, canResolve: true }),
    ).toEqual({ key: "attendance-checkin-stale-1-gone", message: CHECK_IN_STALE_MESSAGE });
  });

  test("tras la propia checada (en vuelo) o con el día cargando, no avisa", () => {
    expect(
      getStaleCheckInNotice({ kind: "entrada", empleado: 1, row: byEmpleado(1), isBusy: true, canResolve: true }),
    ).toBeNull();
    expect(
      getStaleCheckInNotice({ kind: "entrada", empleado: 1, row: byEmpleado(1), isBusy: false, canResolve: false }),
    ).toBeNull();
  });
});
