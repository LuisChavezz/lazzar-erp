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

/**
 * Estado de la preselección de un reporte: para qué sucursal ya se decidió
 * (`"pending"` mientras no se ha decidido nada), si el usuario eligió a mano
 * bajo esa sucursal y qué almacén puso la preselección (para saber si el valor
 * actual es suyo o del usuario).
 */
export interface WarehousePreselectionState {
  decidedFor: number | null | "pending";
  manual: boolean;
  autoId: number | null;
}

export const INITIAL_WAREHOUSE_PRESELECTION: WarehousePreselectionState = {
  decidedFor: "pending",
  manual: false,
  autoId: null,
};

/**
 * Siguiente paso de la preselección cuando la sucursal válida del workspace es
 * `branchId` (ya resuelta) y su almacén único es `defaultId`. `apply` es el
 * almacén a fijar (`null` = quitar), o `undefined` si no hay que tocar nada.
 *
 * - Primera decisión: preselecciona solo si el usuario no eligió nada aún.
 * - Cambio de sucursal: aplica la regla para la nueva. Con un almacén único lo
 *   fija; sin él, quita el que había puesto la preselección (era de la otra
 *   sucursal) y deja en paz una elección del usuario.
 * - Misma sucursal: nada; una elección del usuario bajo ella nunca se pisa.
 */
export const decideWarehousePreselection = (
  state: WarehousePreselectionState,
  branchId: number | null,
  defaultId: number | null,
  almacenId: number | null,
): { next: WarehousePreselectionState; apply?: number | null } => {
  if (state.decidedFor === branchId) return { next: state };

  if (state.decidedFor === "pending") {
    if (!state.manual && almacenId === null && defaultId !== null) {
      return { next: { decidedFor: branchId, manual: false, autoId: defaultId }, apply: defaultId };
    }
    return { next: { ...state, decidedFor: branchId } };
  }

  if (defaultId !== null) {
    return { next: { decidedFor: branchId, manual: false, autoId: defaultId }, apply: defaultId };
  }
  if (almacenId !== null && almacenId === state.autoId) {
    return { next: { decidedFor: branchId, manual: false, autoId: null }, apply: null };
  }
  return { next: { decidedFor: branchId, manual: false, autoId: null } };
};
