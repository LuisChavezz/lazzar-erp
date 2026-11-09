"use client";

import { useState } from "react";
import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";
import { useValidWorkspaceBranchId } from "@/src/features/workspace/hooks/useValidWorkspaceBranchId";
import {
  decideWarehousePreselection,
  INITIAL_WAREHOUSE_PRESELECTION,
  pickBranchWarehouseId,
} from "../utils/pickBranchWarehouseId";

/**
 * Preselecciona el almacén de un reporte con el de la sucursal del workspace,
 * solo si esa sucursal tiene exactamente un almacén activo (ver
 * `pickBranchWarehouseId`). La lista completa sigue disponible en el filtro.
 *
 * Decide cuando la sucursal y los almacenes ya cargaron (si alguna consulta
 * falla, no preselecciona) y vuelve a decidir si el usuario cambia de sucursal
 * en el workspace (ver `decideWarehousePreselection`). `settle()` marca una
 * elección del usuario: bajo la misma sucursal, la preselección ya no la pisa.
 *
 * El ajuste es durante el render (no en un efecto), como el resto de los
 * ajustes de estado del proyecto: `onPreselect` debe actualizar estado del
 * mismo componente (`null` quita el almacén que la preselección había puesto).
 */
export function useWarehousePreselection(
  almacenId: number | null,
  onPreselect: (almacenId: number | null) => void,
) {
  const { branchId, isLoading: isLoadingBranch } = useValidWorkspaceBranchId();
  const { data: warehouses, isLoading: isLoadingWarehouses } = useWarehouses();
  const [state, setState] = useState(INITIAL_WAREHOUSE_PRESELECTION);

  if (!isLoadingBranch && !isLoadingWarehouses && state.decidedFor !== branchId) {
    const defaultId = pickBranchWarehouseId(branchId, warehouses ?? []);
    const { next, apply } = decideWarehousePreselection(state, branchId, defaultId, almacenId);
    setState(next);
    if (apply !== undefined) onPreselect(apply);
  }

  return { settle: () => setState((prev) => ({ ...prev, manual: true, autoId: null })) };
}
