import type { Warehouse } from "@/src/features/warehouses/interfaces/warehouse.interface";

/**
 * Almacén que un reporte puede preseleccionar para la sucursal del workspace:
 * el ÚNICO almacén activo de esa sucursal. Con varios no se elige ninguno (no
 * hay uno que sea "el" de la sucursal) y sin sucursal válida tampoco.
 *
 * `sucursal` del almacén es la PK de la sucursal, el mismo valor que `id` de
 * `/nucleo/mis-sucursales/` (de donde sale `useValidWorkspaceBranchId`).
 */
export const pickBranchWarehouseId = (
  branchId: number | null,
  warehouses: readonly Pick<Warehouse, "id_almacen" | "sucursal" | "estatus">[],
): number | null => {
  if (branchId === null) return null;
  const ofBranch = warehouses.filter((w) => w.sucursal === branchId && w.estatus === "ACTIVO");
  return ofBranch.length === 1 ? ofBranch[0].id_almacen : null;
};
