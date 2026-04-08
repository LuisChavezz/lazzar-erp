import { facturama_api } from "@/src/api/facturama.api";
import { VerifyRfcResponse } from "../interfaces/customer.interface";

/**
 * Consulta el estado fiscal del RFC directamente en Facturama.
 * Esta funcion solo puede ejecutarse del lado servidor porque usa credenciales privadas.
 */
export const verifyRfcWithFacturama = async (rfc: string): Promise<VerifyRfcResponse> => {
  const normalizedRfc = rfc.trim().toUpperCase();

  if (!normalizedRfc) {
    throw new Error("El RFC es requerido.");
  }

  const response = await facturama_api.get<VerifyRfcResponse>("/customers/status", {
    params: {
      rfc: normalizedRfc,
    },
  });

  return response.data;
};