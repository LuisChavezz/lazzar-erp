import { v1_api } from "@/src/api/v1.api";
import { SatCatalogsResponse } from "../interfaces/sat-info.interface";


export const getSatInfo = async (): Promise<SatCatalogsResponse> => {
  const response = await v1_api.get("/nucleo/sat/catalogos/");
  return response.data;
};