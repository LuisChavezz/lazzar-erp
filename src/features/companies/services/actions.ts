import { Company } from "../interfaces/company.interface";
import { CompanyFormValues } from "../schemas/companies.schema";
import { v1_api } from "@/src/api/v1.api";


export const getCompanies = async (): Promise<Company[]> => {
  const response = await v1_api.get("/nucleo/empresas/");
  return response.data;
};

export const getMyCompanies = async (): Promise<Company[]> => {
  const response = await v1_api.get("/nucleo/mis-empresas/");
  return response.data;
};

export const registerCompany = async (values: CompanyFormValues) => {

  const response = await v1_api.post("/nucleo/empresas/", values);  
  return response.data;
};

export const updateCompany = async (id: number, values: CompanyFormValues) => {
  const response = await v1_api.put(`/nucleo/empresas/${id}/`, values);
  return response.data;
};

export const deleteCompany = async (id: number) => {
  const response = await v1_api.delete(`/nucleo/empresas/${id}/`);
  return response.data;
};