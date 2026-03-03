import { v1_api } from "@/src/api/v1.api";
import { SatProdservCode } from "../interfaces/sat-prodserv-code.interface";


export const getSatProdservCodes = async (): Promise<SatProdservCode[]> => {
  const response = await v1_api.get<SatProdservCode[]>("/nucleo/sat/prod-serv/");
  return response.data;
};
