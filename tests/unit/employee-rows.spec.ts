import { expect, test } from "@playwright/test";
import {
  buildEmployeeRows,
  getStaleEmployeeDialogNotice,
} from "@/src/features/employees/utils/employeeRows";
import { EMPLOYEE_HEADER_FILTERS, getColumns } from "@/src/features/employees/components/EmployeeColumns";
import { buildDistinctFilterOptions } from "@/src/utils/columnFilterOptions";
import type { Employee } from "@/src/features/employees/interfaces/employee.interface";

/**
 * Pruebas unitarias de EC-623 sobre el listado de empleados: la regla con que
 * un diálogo de fila (desactivar/reactivar) se cierra con aviso cuando el
 * empleado cambia por fuera, y el rótulo único `#N` de un FK fuera de su
 * catálogo. Funciones puras; no se renderiza nada.
 */

const employee = (id: number, overrides: Partial<Employee> = {}): Employee =>
  ({ id, nombre: "QA", apellido_paterno: "PRUEBA", activo: true, puesto: 1, departamento: 1, sucursal: 1, ...overrides }) as Employee;

test.describe("getStaleEmployeeDialogNotice", () => {
  test("desactivar: si `activo` pasa a false con el diálogo abierto y sin acción propia, se cierra con aviso", () => {
    expect(
      getStaleEmployeeDialogNotice({ targetId: 18, target: { activo: false }, expectedActivo: true, isBusy: false }),
    ).toEqual({
      key: "employee-stale-18-false",
      message: "El empleado cambió de estatus: ya está inactivo. Se actualizó el listado.",
    });
  });

  test("reactivar: si `activo` pasa a true por fuera, se cierra con aviso", () => {
    expect(
      getStaleEmployeeDialogNotice({ targetId: 18, target: { activo: true }, expectedActivo: false, isBusy: false })
        ?.message,
    ).toBe("El empleado cambió de estatus: ya está activo. Se actualizó el listado.");
  });

  test("el empleado ya no está en el listado: aviso de registro inexistente", () => {
    expect(
      getStaleEmployeeDialogNotice({ targetId: 18, target: null, expectedActivo: true, isBusy: false }),
    ).toEqual({ key: "employee-stale-18-gone", message: "El empleado ya no existe. Se actualizó el listado." });
  });

  test("la acción PROPIA en vuelo no cierra el diálogo aunque el optimista ya invirtió `activo`", () => {
    expect(
      getStaleEmployeeDialogNotice({ targetId: 18, target: { activo: false }, expectedActivo: true, isBusy: true }),
    ).toBeNull();
    expect(
      getStaleEmployeeDialogNotice({ targetId: 18, target: null, expectedActivo: true, isBusy: true }),
    ).toBeNull();
  });

  test("sin cambios, o sin diálogo abierto, no hay aviso", () => {
    expect(
      getStaleEmployeeDialogNotice({ targetId: 18, target: { activo: true }, expectedActivo: true, isBusy: false }),
    ).toBeNull();
    expect(
      getStaleEmployeeDialogNotice({ targetId: null, target: null, expectedActivo: true, isBusy: false }),
    ).toBeNull();
  });
});

test.describe("buildEmployeeRows › FK fuera de catálogo", () => {
  const rows = buildEmployeeRows([employee(1, { puesto: 99, departamento: 7, sucursal: 61 }), employee(2)], {
    positionNameById: new Map([[1, "DESARROLLADOR"]]),
    departmentNameById: new Map([[1, "GENERAL"]]),
    branchNameById: new Map([[1, "Toneles"]]),
  });

  test("rotula `Puesto #N` / `Departamento #N` / `Sucursal #N` y resuelve los conocidos", () => {
    expect(rows[0]).toMatchObject({
      puesto_nombre: "Puesto #99",
      departamento_nombre: "Departamento #7",
      sucursal_nombre: "Sucursal #61",
    });
    expect(rows[1]).toMatchObject({ puesto_nombre: "DESARROLLADOR", departamento_nombre: "GENERAL", sucursal_nombre: "Toneles" });
  });

  test("la celda y la opción del filtro de encabezado muestran el mismo texto", () => {
    const columns = getColumns({ canEdit: false, canDelete: false });
    for (const id of ["puesto", "departamento", "sucursal"] as const) {
      const column = columns.find((c) => c.id === id) as { accessorFn: (row: unknown, index: number) => unknown };
      const spec = EMPLOYEE_HEADER_FILTERS[id];
      if (spec?.type !== "distinct") throw new Error(`${id}: se esperaba un spec distinct`);
      const options = buildDistinctFilterOptions(rows, spec.get, spec.label);
      const cellText = column.accessorFn(rows[0], 0);
      const option = options.find((o) => o.value === String(spec.get(rows[0])));
      expect(option?.label).toBe(cellText);
    }
  });
});
