import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import type { ReceiptOnboardingData } from "@/src/features/receipts/interfaces/receipt-onboarding.interface";
import { getRfidReconciliationOnboarding } from "../services/actions";
import { RFID_RECONCILIATION_ONBOARDING_KEY } from "../constants/rfidReconciliations";

/**
 * OC/OP sobre las que se puede levantar un encuadre y sus almacenes
 * (`GET .../onboarding/`, la misma forma que `recepciones/onboarding/`). Solo
 * se consulta con el alta abierta (`enabled`). Un 4xx no se reintenta.
 */
export const useRfidReconciliationOnboarding = (enabled: boolean) => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<ReceiptOnboardingData>(
    {
      queryKey: RFID_RECONCILIATION_ONBOARDING_KEY,
      queryFn: getRfidReconciliationOnboarding,
      retry: retryUnlessClientError,
      enabled,
    },
    { toastId: "rfid-reconciliation-onboarding-refetch-error" },
  );
  return { onboardingData: data, isLoading, isInitialError, error };
};
