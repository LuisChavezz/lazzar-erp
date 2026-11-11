import { v1_api } from "@/src/api/v1.api";
import { SatCatalogsResponse } from "../interfaces/sat-info.interface";
import { FiscalAddress } from "../interfaces/fiscal-address.interface";


export const getSatInfo = async (): Promise<SatCatalogsResponse> => {
  const response = await v1_api.get("/nucleo/sat/catalogos/");
  return response.data;
};

/** Siempre la empresa ACTIVA del usuario: no se manda id (EC-860). */
const FISCAL_ADDRESS_PATH = "/nucleo/empresa-actual/domicilio-fiscal/";

export const getFiscalAddress = async (signal?: AbortSignal): Promise<FiscalAddress> => {
  const response = await v1_api.get(FISCAL_ADDRESS_PATH, { signal });
  return response.data;
};

/**
 * Guarda con `PATCH`, nunca con `PUT`: el `PUT` deja en blanco los campos que
 * no se manden. Responde el domicilio ya guardado.
 */
export const updateFiscalAddress = async (data: Partial<FiscalAddress>): Promise<FiscalAddress> => {
  const response = await v1_api.patch(FISCAL_ADDRESS_PATH, data);
  return response.data;
};
