import { expect, test } from "@playwright/test";
import { pickValidBranchId } from "@/src/features/workspace/utils/pickValidBranchId";

/**
 * Pruebas unitarias de EC-622: cuándo la sucursal del workspace cuenta como
 * válida para preseleccionarla o enviarla.
 */
test.describe("pickValidBranchId", () => {
  const branches = [{ id: 1 }, { id: 61 }];

  test("sin sucursal elegida devuelve null", () => {
    expect(pickValidBranchId(null, branches)).toBeNull();
    expect(pickValidBranchId(undefined, branches)).toBeNull();
  });

  test("una sucursal obsoleta o desconocida devuelve null", () => {
    expect(pickValidBranchId(99, branches)).toBeNull();
    expect(pickValidBranchId(61, [])).toBeNull();
  });

  test("una sucursal que está en la lista devuelve su id", () => {
    expect(pickValidBranchId(61, branches)).toBe(61);
  });

  test("compara por `id`, no por `id_sucursal`", () => {
    // `mis-sucursales` no trae `id_sucursal`; aunque viniera con otro valor,
    // la coincidencia es por `id`.
    const conIdSucursal = [{ id: 61, id_sucursal: 7 }];
    expect(pickValidBranchId(61, conIdSucursal)).toBe(61);
    expect(pickValidBranchId(7, conIdSucursal)).toBeNull();
  });
});
