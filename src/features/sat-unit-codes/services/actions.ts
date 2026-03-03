import { v1_api } from "@/src/api/v1.api";
import { SatUnitCode } from "../interfaces/sat-unit-code.interface";


export const getSatUnitCodes = async (): Promise<SatUnitCode[]> => {
  const { data } = await v1_api.get<SatUnitCode[]>("/nucleo/sat/unidades/");
  return data;
};