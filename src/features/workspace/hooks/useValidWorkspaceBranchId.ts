"use client";

import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useWorkspaceStore } from "../store/workspace.store";
import { pickValidBranchId } from "../utils/pickValidBranchId";

/**
 * Id de la sucursal del workspace, solo si está entre las sucursales del
 * usuario en la empresa ACTIVA del workspace (`/nucleo/mis-sucursales/`). Es la
 * sucursal por defecto de los formularios que crean un documento; no hay
 * respaldo a una sucursal fija.
 *
 * Solo cruza con esa lista: no garantiza que el backend la acepte. La OC y la
 * cotización validan la sucursal contra `user.empresa`, no contra la empresa
 * activa, así que para un usuario multiempresa con otra empresa activa el
 * backend puede rechazarla (nucleo-erp#720).
 *
 * El store se persiste y nunca se revalida, así que `selectedBranch` puede ser
 * `null` ("continuar sin sucursal") o estar obsoleto (inactiva, de otra
 * empresa); por eso se cruza con la lista y no se usa tal cual (ver
 * `pickValidBranchId`).
 *
 * - `branchId`: el id válido, o `null` si no hay (o aún no se sabe).
 * - `isLoading`: la lista se está cargando; mientras tanto `branchId` es `null`
 *   y no debe tomarse como "no hay sucursal".
 * - `isError`: la lista nunca cargó; `branchId` es `null` pero no porque el
 *   usuario no tenga sucursal.
 *
 * Sin sucursal en el workspace no se consulta nada.
 */
export function useValidWorkspaceBranchId() {
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);
  const selectedBranchId = useWorkspaceStore((state) => state.selectedBranch?.id);
  const { branches, isLoading, isInitialError } = useCompanyBranches(
    selectedBranchId ? companyId : null,
  );

  return {
    branchId: pickValidBranchId(selectedBranchId, branches),
    isLoading,
    isError: isInitialError,
  };
}
