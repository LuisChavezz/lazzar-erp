"use client";

import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useWorkspaceStore } from "../store/workspace.store";

/**
 * Id de la sucursal del workspace, solo si sigue siendo VÁLIDA: que esté entre
 * las sucursales del usuario en la empresa activa (`/nucleo/mis-sucursales/`).
 * Es la sucursal por defecto de los formularios que crean un documento; no hay
 * respaldo a una sucursal fija.
 *
 * El store se persiste y nunca se revalida, así que `selectedBranch` puede ser
 * `null` ("continuar sin sucursal") o estar obsoleto (inactiva, de otra
 * empresa); por eso se cruza con la lista y no se usa tal cual. Se compara por
 * `id`: `mis-sucursales` devuelve la PK como `id` y NO trae `id_sucursal`
 * aunque la interfaz `Branch` lo declare.
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

  const branchId =
    selectedBranchId && branches.some((branch) => branch.id === selectedBranchId)
      ? selectedBranchId
      : null;

  return { branchId, isLoading, isError: isInitialError };
}
