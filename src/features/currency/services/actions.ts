
import { v1_api } from "@/src/api/v1.api";
import { Currency } from "../interfaces/currency.interface";


export const getCurrencies = async (): Promise<Currency[]> => {
  const response = await v1_api.get("/nucleo/monedas/");

  return response.data;
};

export const createCurrency = async (currency: Partial<Currency>) => {
  const response = await v1_api.post("/nucleo/monedas/", currency);

  return response.data;
};

export const updateCurrency = async (currency: Partial<Currency>) => {
  const response = await v1_api.put(`/nucleo/monedas/${currency.codigo_iso}/`, currency);

  return response.data;
};

export const deleteCurrency = async (currencyIso: string) => {
  const response = await v1_api.delete(`/nucleo/monedas/${currencyIso}/`);

  return response.data;
};