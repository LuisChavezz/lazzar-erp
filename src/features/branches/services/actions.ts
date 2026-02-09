import { Branch } from "../interfaces/branch.interface";
import { v1_api } from "@/src/api/v1.api";


export const getBranches = async (): Promise<Branch[]> => {
  const response = await v1_api.get("/nucleo/sucursales/");

  return response.data;
};

export const getCompanyBranches = async (companyId: number): Promise<Branch[]> => {
  const response = await v1_api.get(`/nucleo/mis-sucursales/?empresa_id=${companyId}`);

  return response.data;
};