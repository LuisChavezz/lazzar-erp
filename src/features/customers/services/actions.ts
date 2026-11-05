import { v1_api } from "@/src/api/v1.api";
import {
  Customer,
  CustomerCreate,
  CustomerCreateResponse,
  CustomerDetail,
  CustomerRfcVerification,
  VerifyCustomerRfcParams,
} from "../interfaces/customer.interface";
import { CustomerAddress, CustomerAddressCreate } from "../interfaces/customer-address.interface";
import type { CustomerKpis } from "../interfaces/customer-kpis.interface";

/**
 * Indicadores de clientes (`GET /terceros/clientes/kpis/`), calculados por el
 * backend con un alcance que depende del rol. Sin params: el endpoint no
 * acepta ninguno.
 */
export const getCustomerKpis = async (): Promise<CustomerKpis> => {
  const response = await v1_api.get<CustomerKpis>("/terceros/clientes/kpis/");
  return response.data;
};


export const getCustomers = async (): Promise<Customer[]> => {
  const response = await v1_api.get<Customer[]>("/terceros/clientes/");
  return response.data;
};

export const getCustomer = async (id: number): Promise<CustomerDetail> => {
  const response = await v1_api.get<CustomerDetail>(`/terceros/clientes/${id}/`);
  return response.data;
};

export const createCustomer = async (customer: CustomerCreate): Promise<CustomerCreateResponse> => {
  const response = await v1_api.post<CustomerCreateResponse>("/terceros/clientes/", customer);
  return response.data;
};

export const updateCustomer = async (id: number, customer: CustomerCreate): Promise<Customer> => {
  const response = await v1_api.put<Customer>(`/terceros/clientes/${id}/`, customer);
  return response.data;
}

/**
 * Verifica un RFC con la misma regla que el guardado del cliente. `cliente`
 * solo al editar; sin él aplica la regla de la empresa del usuario (alta). Un
 * RFC inválido responde 200 con `valido: false`.
 */
export const verifyCustomerRfc = async ({
  rfc,
  cliente,
}: VerifyCustomerRfcParams): Promise<CustomerRfcVerification> => {
  const response = await v1_api.get<CustomerRfcVerification>("/terceros/clientes/verificar-rfc/", {
    params: cliente === undefined ? { rfc } : { rfc, cliente },
  });
  return response.data;
};

/**
 * Direcciones de envío ACTIVAS de UN cliente
 * (`GET /terceros/direcciones-clientes/?cliente=<pk>`), con la predeterminada
 * primero. Arreglo plano, sin paginar.
 *
 * El backend acota a la empresa del usuario ANTES de aplicar el filtro, así que
 * un cliente de otra empresa (o inexistente) responde `200 []`. Un valor que no
 * es entero responde 400: quien llama debe pasar un pk positivo (ver
 * `useCustomerAddresses`, que no habilita la consulta sin uno).
 */
export const getCustomerAddresses = async (clienteId: number): Promise<CustomerAddress[]> => {
  const response = await v1_api.get<CustomerAddress[]>(`/terceros/direcciones-clientes/`, {
    params: { cliente: clienteId },
  });
  return response.data;
}

export const createCustomerAddress = async (address: CustomerAddressCreate): Promise<CustomerAddressCreate> => {
  const response = await v1_api.post<CustomerAddressCreate>(`/terceros/direcciones-clientes/`, address);
  return response.data;
}

export const updateCustomerAddress = async (id: number, address: CustomerAddressCreate): Promise<CustomerAddressCreate> => {
  const response = await v1_api.patch<CustomerAddressCreate>(`/terceros/direcciones-clientes/${id}/`, address);
  return response.data;
}