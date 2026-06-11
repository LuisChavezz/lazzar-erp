"use client";

import { useMutation } from "@tanstack/react-query";
import { verifyRfc } from "../services/actions";
import { VerifyRfcResponse } from "../interfaces/facturama.interface";

/**
 * Hook para verificar un RFC contra el servicio fiscal de Facturama.
*/
export const useVerifyRfc = () => {
  const mutation = useMutation<VerifyRfcResponse, unknown, string>({
    mutationFn: (rfc: string) => verifyRfc(rfc),
  });

  return {
    verifyRfcAsync: mutation.mutateAsync,
    verifyRfcData: mutation.data,
    isVerifyingRfc: mutation.isPending,
    verifyRfcError: mutation.error,
    resetVerifyRfc: mutation.reset,
  };
};
