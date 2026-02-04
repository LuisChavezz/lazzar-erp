import { CompanyFormValues } from "../schemas/companies.schema";
import { v1_api } from "@/src/api/v1.api";


export const registerCompany = async (values: CompanyFormValues) => {

  const response = await v1_api.post("/empresas/", values);
  return response.data;
};