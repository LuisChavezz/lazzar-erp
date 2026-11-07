"use client";

import { useState } from "react";
import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";
import { useValidWorkspaceBranchId } from "@/src/features/workspace/hooks/useValidWorkspaceBranchId";
import { pickBranchWarehouseId } from "../utils/pickBranchWarehouseId";

/**
 * Preselecciona el almacén de un reporte con el de la sucursal del workspace,
 * UNA sola vez y solo si esa sucursal tiene exactamente un almacén activo (ver
 * `pickBranchWarehouseId`). La lista completa sigue disponible en el filtro.
 *
 * Mientras cargan la sucursal o los almacenes no se decide nada; si alguna de
 * las dos consultas falla, no se preselecciona. En cuanto el usuario elige un
 * almacén (o "Todos") antes de que se resuelva, `settle()` cancela la
 * preselección para no pisar su elección.
 *
 * El ajuste es durante el render (no en un efecto), como el resto de los
 * ajustes de estado del proyecto: `onPreselect` debe ser un setter de estado
 * del mismo componente.
 */
export function useWarehousePreselection(
  almacenId: number | null,
  onPreselect: (almacenId: number) => void,
) {
  const { branchId, isLoading: isLoadingBranch } = useValidWorkspaceBranchId();
  const { data: warehouses, isLoading: isLoadingWarehouses } = useWarehouses();
  const [settled, setSettled] = useState(false);

  const isResolved = !isLoadingBranch && !isLoadingWarehouses;
  if (!settled && isResolved) {
    setSettled(true);
    const defaultId = pickBranchWarehouseId(branchId, warehouses ?? []);
    if (almacenId === null && defaultId !== null) onPreselect(defaultId);
  }

  return { settle: () => setSettled(true) };
}
