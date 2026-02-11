
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