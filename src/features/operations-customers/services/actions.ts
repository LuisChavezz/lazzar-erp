import { v1_api } from "@/src/api/v1.api";
import { OperationsCustomer } from "../interfaces/operations-customer.interface";

export const getOperationsCustomers = async (): Promise<OperationsCustomer[]> => {
  const response = await v1_api.get<OperationsCustomer[]>("/terceros/clientes-mesa-control/");
  return response.data;
};
