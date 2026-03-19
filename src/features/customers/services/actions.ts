import { v1_api } from "@/src/api/v1.api";
import { Customer, CustomerCreate } from "../interfaces/customer.interface";


export const getCustomers = async (): Promise<Customer[]> => {
  const response = await v1_api.get<Customer[]>("/terceros/clientes/");
  return response.data;
};

export const createCustomer = async (customer: CustomerCreate): Promise<Customer> => {
  const response = await v1_api.post<Customer>("/terceros/clientes/", customer);
  return response.data;
};

export const updateCustomer = async (id: number, customer: CustomerCreate): Promise<Customer> => {
  const response = await v1_api.put<Customer>(`/terceros/clientes/${id}/`, customer);
  return response.data;
}