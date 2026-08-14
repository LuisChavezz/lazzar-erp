import { v1_api } from "@/src/api/v1.api";
import type { Department } from "../interfaces/department.interface";

export const getDepartments = async (): Promise<Department[]> => {
  const { data } = await v1_api.get<Department[]>("/nucleo/departamentos/");
  return data;
};
