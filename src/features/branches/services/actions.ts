import { Branch } from "../interfaces/branch.interface";
import { v1_api } from "@/src/api/v1.api";

/**
 * Sucursales de una empresa del usuario.
 *
 * Única acción viva del módulo: la alimenta `useCompanyBranches`, que consumen
 * el workspace, el alta de empleados y series y folios. El CRUD de sucursales
 * (`getBranches`/`createBranch`/`updateBranch` sobre `/nucleo/sucursales/`) se
 * eliminó junto con `BranchList`, la pantalla de /config que era su único
 * consumidor y que llevaba tiempo deshabilitada.
 */
export const getCompanyBranches = async (companyId: number): Promise<Branch[]> => {
  const response = await v1_api.get(`/nucleo/mis-sucursales/?empresa_id=${companyId}`);

  return response.data;
};
