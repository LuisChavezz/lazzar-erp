"use client";

import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useWorkspaceStore } from "../store/workspace.store";
import { pickValidBranchId } from "../utils/pickValidBranchId";
import { useSessionCompany } from "@/src/features/workspace/hooks/useSessionCompany";

/**
 * Id de la sucursal del workspace, solo si está entre las sucursales del
 * usuario en la empresa de la SESIÓN (`/nucleo/mis-sucursales/`). Es la
 * sucursal por defecto de los formularios que crean un documento; no hay
 * respaldo a una sucursal fija.
 *
 * Solo cruza con esa lista: no garantiza que el backend la acepte. La empresa
 * de la sesión es `user.empresa` (EC-842), la misma contra la que la OC y la
 * cotización validan la sucursal, así que ya no hay desfase por una "empresa
 * activa" distinta (nucleo-erp#720).
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
  const sessionCompany = useSessionCompany();
  const companyId = sessionCompany.companyId;
  const selectedBranchId = useWorkspaceStore((state) => state.selectedBranch?.id);
  const { branches, isLoading, isInitialError } = useCompanyBranches(
    selectedBranchId ? companyId : null,
  );

  return {
    branchId: pickValidBranchId(selectedBranchId, branches),
    // Con sucursal elegida, confirmar la empresa de la sesión también es carga:
    // sin esto se leería "no hay sucursal" mientras llega.
    isLoading: isLoading || (!!selectedBranchId && sessionCompany.status === "loading"),
    isError: isInitialError,
  };
}
