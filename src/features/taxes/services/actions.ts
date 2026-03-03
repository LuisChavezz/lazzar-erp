import { v1_api } from "@/src/api/v1.api";
import { Tax } from "../interfaces/tax.interface";


export const getTaxes = async (): Promise<Tax[]> => {
  const { data } = await v1_api.get<Tax[]>("/nucleo/impuestos/");
  return data;
};