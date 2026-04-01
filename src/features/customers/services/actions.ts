import { v1_api } from "@/src/api/v1.api";
import { facturama_api } from "@/src/api/facturama.api";
import { Customer, CustomerCreate, VerifyRfcResponse } from "../interfaces/customer.interface";


export const getCustomers = async (): Promise<Customer[]> => {
  const response = await v1_api.get<Customer[]>("/terceros/clientes/");
  return response.data;
};

export const getCustomer = async (id: number): Promise<Customer> => {
  const response = await v1_api.get<Customer>(`/terceros/clientes/${id}/`);
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

export const verifyRfc = async (rfc: string): Promise<VerifyRfcResponse> => {
  const response = await facturama_api.get<VerifyRfcResponse>(`/customers/status?rfc=${rfc}`);
  return response.data;
}