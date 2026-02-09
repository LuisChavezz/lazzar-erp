import { Company } from "../interfaces/company.interface";
import { CompanyFormValues } from "../schemas/companies.schema";
import { v1_api } from "@/src/api/v1.api";


export const registerCompany = async (values: CompanyFormValues) => {

  const response = await v1_api.post("/nucleo/empresas/", values);  
  return response.data;
};

export const getCompanies = async (): Promise<Company[]> => {
  const response = await v1_api.get("/nucleo/empresas/");

  return response.data;
};

export const getMyCompanies = async (): Promise<Company[]> => {
  const response = await v1_api.get("/nucleo/mis-empresas/");

  return response.data;
};
