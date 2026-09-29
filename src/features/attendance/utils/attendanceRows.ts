import type { Employee } from "@/src/features/employees/interfaces/employee.interface";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import type { Shift } from "@/src/features/shifts/interfaces/shift.interface";
import {
  getDiaLaboralCodeForDateKey,
  parseDiasLaborales,
} from "@/src/features/shifts/constants/diasLaborales";
import type { Attendance } from "../interfaces/attendance.interface";
import { SIN_REGISTRO, type EstadoAsistencia } from "../constants/attendanceChoices";

/**
 * Modelos de vista de las dos tablas y las funciones PURAS que los arman. Los
 * nombres viajan EN LA FILA y no se resuelven en el accessor: TanStack guarda
 * el valor del accessor por fila y solo lo recalcula cuando cambia `data`, así
 * que un catálogo que llega tarde dejaría congelado el respaldo (mismo arreglo
 * que `VacationRow`).
 */

/** Respaldo de un nombre mientras su catálogo carga. */
const LOADING_NAME = "…";

/** Registro de asistencia con los nombres de sus FK resueltos. */
export type AttendanceRow = Attendance & {
  empleado_nombre: string;
  numero_empleado: string;
  turno_nombre: string;
};

/**
 * Una fila del PASE DE LISTA: un empleado en el día elegido, tenga o no
 * registro. Se identifica por el empleado (a lo sumo hay un registro por
 * empleado y día).
 */
export interface RollCallRow {
  empleado: number;
  fecha: string;
  empleado_nombre: string;
  numero_empleado: string;
  /**
   * Turno ACTUAL del empleado: el que usan la checada (lo toma el servidor) y
   * "Marcar falta". `null` si no tiene o si el empleado no está en el catálogo.
   */
  turno_actual: number | null;
  /**
   * El empleado (del catálogo) no tiene turno asignado: se avisa con "Sin turno
   * asignado" y no se puede checar su entrada ni marcar su falta. Las acciones
   * sobre un registro ya existente no dependen del turno actual: usan el del
   * registro.
   */
  sin_turno: boolean;
  /** Nombre del turno a mostrar: el del registro si existe, si no el actual. */
  turno_nombre: string | null;
  record: AttendanceRow | null;
  /** Valor crudo para buscar y ordenar: el estado del registro o `SIN_REGISTRO`. */
  estado: EstadoAsistencia | typeof SIN_REGISTRO;
}

export interface NameCatalogs {
  employees: readonly Employee[];
  employeesLoaded: boolean;
  shifts: readonly Shift[];
  shiftsLoaded: boolean;
}

const indexById = <T extends { id: number }>(items: readonly T[]) =>
  new Map(items.map((item) => [item.id, item]));

const resolveEmployeeName = (
  id: number,
  employeeById: Map<number, Employee>,
  loaded: boolean
): { nombre: string; numero: string } => {
  const employee = employeeById.get(id);
  if (employee) {
    return { nombre: getEmployeeFullName(employee), numero: employee.numero_empleado };
  }
  return { nombre: loaded ? `Empleado #${id}` : LOADING_NAME, numero: "" };
};

const resolveShiftName = (id: number, shiftById: Map<number, Shift>, loaded: boolean): string =>
  shiftById.get(id)?.nombre ?? (loaded ? `Turno #${id}` : LOADING_NAME);

/** Registros con los nombres de empleado y turno resueltos (historial y pase de lista). */
export const buildAttendanceRows = (
  records: readonly Attendance[],
  catalogs: NameCatalogs
): AttendanceRow[] => {
  const employeeById = indexById(catalogs.employees);
  const shiftById = indexById(catalogs.shifts);
  return records.map((record) => {
    const { nombre, numero } = resolveEmployeeName(
      record.empleado,
      employeeById,
      catalogs.employeesLoaded
    );
    return {
      ...record,
      empleado_nombre: nombre,
      numero_empleado: numero,
      turno_nombre: resolveShiftName(record.turno, shiftById, catalogs.shiftsLoaded),
    };
  });
};

/**
 * ¿El turno labora el día `fecha` ("YYYY-MM-DD")?
 *
 * - Sin `dias_laborales` (null o vacío): labora TODOS los días (decisión 4).
 * - Una cadena que `parseDiasLaborales` no reconoce (un valor heredado como
 *   "Lunes a viernes"): tampoco se puede saber, así que cuenta como laboral.
 *   Ocultar por error a alguien que sí trabaja es peor que mostrar de más.
 * - Si no, los códigos parseados; el formato heredado "L,M,M,J,V" ya lo
 *   resuelve `parseDiasLaborales` (la M repetida es miércoles).
 *
 * El código del día sale de `getDiaLaboralCodeForDateKey` (fecha calendario
 * en UTC, sin pasar por la zona del navegador), el mismo que usa vacaciones.
 */
export const shiftWorksOn = (diasLaborales: string | null, fecha: string): boolean => {
  if (!diasLaborales?.trim()) {
    return true;
  }
  const dias = parseDiasLaborales(diasLaborales);
  if (dias.length === 0) {
    return true;
  }
  return dias.includes(getDiaLaboralCodeForDateKey(fecha));
};

export interface RollCallResult {
  rows: RollCallRow[];
  /** Empleados activos sin registro ocultos porque su turno no labora ese día. */
  hiddenCount: number;
}

/**
 * Filas del pase de lista del día `fecha`: cruza el catálogo de empleados con
 * los registros de ese día.
 *
 * - Un empleado con registro ese día SIEMPRE aparece, aunque esté inactivo o
 *   su turno no labore (el registro existe y hay que poder verlo y
 *   corregirlo). También un registro cuyo empleado no está en el catálogo.
 * - Un empleado ACTIVO sin registro aparece, salvo que su turno no labore ese
 *   día y `showAll` esté apagado ("Mostrar a todos").
 * - Un empleado sin turno aparece siempre (con "Sin turno asignado").
 * - Un inactivo sin registro nunca aparece.
 *
 * `records` puede traer datos de otro día (el `placeholderData` mientras llega
 * la consulta nueva): solo cuentan los de `fecha`.
 */
export const buildRollCallRows = (
  records: readonly Attendance[],
  catalogs: NameCatalogs,
  fecha: string,
  showAll: boolean
): RollCallResult => {
  const shiftById = indexById(catalogs.shifts);
  const employeeIds = new Set(catalogs.employees.map((employee) => employee.id));
  const dayRecords = buildAttendanceRows(
    records.filter((record) => record.fecha === fecha),
    catalogs
  );
  const recordByEmployee = new Map(dayRecords.map((record) => [record.empleado, record]));

  const rows: RollCallRow[] = [];
  let hiddenCount = 0;

  const pushRow = (
    empleado: number,
    nombre: string,
    numero: string,
    turnoActual: number | null,
    sinTurno: boolean,
    record: AttendanceRow | null
  ) => {
    rows.push({
      empleado,
      fecha,
      empleado_nombre: nombre,
      numero_empleado: numero,
      turno_actual: turnoActual,
      sin_turno: sinTurno,
      turno_nombre: record
        ? record.turno_nombre
        : turnoActual !== null
          ? resolveShiftName(turnoActual, shiftById, catalogs.shiftsLoaded)
          : null,
      record,
      estado: record ? record.estado : SIN_REGISTRO,
    });
  };

  for (const employee of catalogs.employees) {
    const record = recordByEmployee.get(employee.id) ?? null;
    if (!record) {
      if (!employee.activo) {
        continue;
      }
      const shift = employee.turno !== null ? shiftById.get(employee.turno) : undefined;
      // Un turno que el catálogo no trae (aún cargando) no se puede evaluar:
      // el empleado se muestra.
      if (shift && !shiftWorksOn(shift.dias_laborales, fecha)) {
        hiddenCount += 1;
        if (!showAll) {
          continue;
        }
      }
    }
    pushRow(
      employee.id,
      getEmployeeFullName(employee),
      employee.numero_empleado,
      employee.turno,
      employee.turno === null,
      record
    );
  }

  for (const record of dayRecords) {
    if (!employeeIds.has(record.empleado)) {
      pushRow(record.empleado, record.empleado_nombre, record.numero_empleado, null, false, record);
    }
  }

  rows.sort((a, b) => a.empleado_nombre.localeCompare(b.empleado_nombre, "es-MX"));
  return { rows, hiddenCount };
};
