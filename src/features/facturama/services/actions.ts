import axios from "axios";
import { VerifyRfcResponse } from "../interfaces/facturama.interface";

/**
 * Verifica el estado fiscal de un RFC contra el servicio de Facturama.
 * Esta función se ejecuta del lado cliente y llama al proxy interno
 * que protege las credenciales de Facturama.
 */
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
};
