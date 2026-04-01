"use client";

import { useMutation } from "@tanstack/react-query";
import { verifyRfc } from "../services/actions";
import { VerifyRfcResponse } from "../interfaces/customer.interface";

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
