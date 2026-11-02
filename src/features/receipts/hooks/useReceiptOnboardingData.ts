import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isClientError } from "@/src/utils/drfWriteErrors";
import { getReceiptOnboargingData } from "../services/actions";
import type { ReceiptOnboardingData } from "../interfaces/receipt-onboarding.interface";

/**
 * Órdenes recibibles del wizard de recepción (`GET /compras/recepciones/onboarding/`).
 * Un 4xx no se reintenta: es el rechazo de un usuario sin empresa
 * (`onboardingRejectionMessage`) y la segunda petición respondería lo mismo.
 */
export const useReceiptOnboardingData = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<ReceiptOnboardingData>(
    {
      queryKey: ["receipt-onboarding-data"],
      queryFn: getReceiptOnboargingData,
      retry: (failureCount, failure) => !isClientError(failure) && failureCount < 1,
    },
    { toastId: "receipt-onboarding-refetch-error" },
  );

  return {
    onboardingData: data,
    isLoading,
    isInitialError,
    error,
  };
};
