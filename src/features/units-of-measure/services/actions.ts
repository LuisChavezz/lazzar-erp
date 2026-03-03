import { v1_api } from "@/src/api/v1.api";
import { UnitOfMeasure } from "../interfaces/unit-of-measure.interface";


export const getUnitsOfMeasure = async (): Promise<UnitOfMeasure[]> => {
  const { data } = await v1_api.get<UnitOfMeasure[]>("/nucleo/unidades-medida/");
  return data;
};
