import axios from "axios";
import { v1_api } from "@/src/api/v1.api";
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
  try {
    const response = await axios.get<VerifyRfcResponse>("/api/facturama/customers/status", {
      params: {
        rfc,
      },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message =
        typeof error.response?.data === "object" &&
        error.response?.data &&
        "error" in error.response.data &&
        typeof error.response.data.error === "string"
          ? error.response.data.error
          : "No se pudo validar el RFC en este momento.";

      throw new Error(message);
    }

    throw error;
  }
}