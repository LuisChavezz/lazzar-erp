import { v1_api } from "@/src/api/v1.api";
import { AccountingCustomer } from "../interfaces/accounting-customer.interface";

export const getAccountingCustomers = async (): Promise<AccountingCustomer[]> => {
  const response = await v1_api.get<AccountingCustomer[]>("/finanzas/clientes-contabilidad/");
  return response.data;
};
