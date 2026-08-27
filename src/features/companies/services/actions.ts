import { Company } from "../interfaces/company.interface";
import { v1_api } from "@/src/api/v1.api";

/**
 * Empresas del usuario autenticado.
 *
 * Única acción viva del módulo: la alimenta `useMyCompanies`, que consume el
 * selector de workspace. El CRUD de empresas (`getCompanies`/`registerCompany`/
 * `updateCompany`/`deleteCompany` sobre `/nucleo/empresas/`) se eliminó junto
 * con `CompanyList`, la pantalla de /config que era su único consumidor y que
 * ya no tenía tarjeta que la alcanzara.
 */
export const getMyCompanies = async (): Promise<Company[]> => {
  const response = await v1_api.get("/nucleo/mis-empresas/");
  return response.data;
};
