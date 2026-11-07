import { expect, test } from "@playwright/test";
import { pickBranchWarehouseId } from "@/src/features/reports/utils/pickBranchWarehouseId";

/**
 * EC-626: los reportes preseleccionan el almacén de la sucursal del workspace
 * solo cuando es el único activo de esa sucursal.
 */
test.describe("pickBranchWarehouseId", () => {
  const w = (id_almacen: number, sucursal: number, estatus: "ACTIVO" | "INACTIVO" = "ACTIVO") => ({
    id_almacen,
    sucursal,
    estatus,
  });

  test("sin sucursal válida no preselecciona", () => {
    expect(pickBranchWarehouseId(null, [w(1, 61)])).toBeNull();
  });

  test("la sucursal con un solo almacén activo lo preselecciona", () => {
    expect(pickBranchWarehouseId(61, [w(1, 61), w(2, 7), w(3, 7)])).toBe(1);
  });

  test("con varios almacenes activos en la sucursal no elige ninguno", () => {
    expect(pickBranchWarehouseId(7, [w(1, 61), w(2, 7), w(3, 7)])).toBeNull();
  });

  test("los inactivos no cuentan: ni como candidato ni para el empate", () => {
    expect(pickBranchWarehouseId(7, [w(2, 7), w(3, 7, "INACTIVO")])).toBe(2);
    expect(pickBranchWarehouseId(7, [w(3, 7, "INACTIVO")])).toBeNull();
  });

  test("una sucursal sin almacenes no preselecciona", () => {
    expect(pickBranchWarehouseId(99, [w(1, 61)])).toBeNull();
  });
});
