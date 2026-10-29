import { expect, test } from "@playwright/test";
import { getGenerateBranchGate } from "@/src/features/payroll/utils/generatePayrollBranch";

/**
 * Pruebas unitarias de EC-636: "Generar quincena" toma la sucursal del
 * workspace y se bloquea sin una válida. La nómina individual no pasa por
 * aquí (deriva la sucursal del empleado).
 */
test.describe("getGenerateBranchGate", () => {
  test("con sucursal válida en el workspace, se genera para ella", () => {
    expect(getGenerateBranchGate({ branchId: 7, isLoading: false, isError: false })).toEqual({
      status: "ready",
      branchId: 7,
    });
  });

  test("mientras la lista carga no es «falta sucursal», pero tampoco se genera", () => {
    expect(getGenerateBranchGate({ branchId: null, isLoading: true, isError: false })).toEqual({
      status: "loading",
      message: "Aún se están cargando tus sucursales. Intenta generar de nuevo en un momento.",
    });
  });

  test("sin sucursal válida: bloqueado, con el mensaje que dice «generar»", () => {
    expect(getGenerateBranchGate({ branchId: null, isLoading: false, isError: false })).toEqual({
      status: "missing",
      message:
        "Tu espacio de trabajo no tiene una sucursal válida. Selecciona una sucursal en el encabezado para generar la quincena.",
    });
  });

  test("si la lista no cargó, no culpa al workspace", () => {
    const gate = getGenerateBranchGate({ branchId: null, isLoading: false, isError: true });
    expect(gate.status).toBe("missing");
    expect(gate.status !== "ready" && gate.message).toBe(
      "No se pudieron cargar tus sucursales para asignarla a la quincena. Recarga la página e inténtalo de nuevo.",
    );
  });
});
