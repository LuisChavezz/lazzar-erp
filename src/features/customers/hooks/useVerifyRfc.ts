"use client";

import { useMutation } from "@tanstack/react-query";
import { verifyCustomerRfc } from "../services/actions";
import { CustomerRfcVerification, VerifyCustomerRfcParams } from "../interfaces/customer.interface";

export const useVerifyRfc = () => {
  const mutation = useMutation<CustomerRfcVerification, unknown, VerifyCustomerRfcParams>({
    mutationFn: (params) => verifyCustomerRfc(params),
  });

  return {
    verifyRfcAsync: mutation.mutateAsync,
    verifyRfcData: mutation.data,
    isVerifyingRfc: mutation.isPending,
    verifyRfcError: mutation.error,
    resetVerifyRfc: mutation.reset,
  };
};
