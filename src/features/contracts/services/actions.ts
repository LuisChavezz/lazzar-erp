import { v1_api } from "@/src/api/v1.api";
import type { Contract, ContractCreate } from "../interfaces/contract.interface";

/**
 * Sin `?activo=true` a propósito: como el resto de catálogos de RH, los
 * contratos dados de baja siguen en el listado con estatus "Inactivo".
 */
export const getContracts = async (): Promise<Contract[]> => {
  const { data } = await v1_api.get<Contract[]>("/hr/contratos/");
  return data;
};

export const createContract = async (contract: ContractCreate): Promise<Contract> => {
  const { data } = await v1_api.post<Contract>("/hr/contratos/", contract);
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT. Con PUT, todo campo ausente del cuerpo se
 * reemplaza; con PATCH solo se actualiza lo que se envía. Mismo criterio que en
 * el resto de catálogos de RH.
 */
export const updateContract = async (
  id: number,
  contract: ContractCreate
): Promise<Contract> => {
  const { data } = await v1_api.patch<Contract>(`/hr/contratos/${id}/`, contract);
  return data;
};

/** Baja lógica: el backend pone `activo` en false, no borra el registro. */
export const deleteContract = async (id: number): Promise<void> => {
  await v1_api.delete(`/hr/contratos/${id}/`);
};
