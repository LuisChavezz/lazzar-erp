import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { useSessionCompanyId } from "@/src/features/workspace/hooks/useSessionCompany";
import { getFiscalAddress } from "../services/actions";

/**
 * Llave del domicilio fiscal. Lleva la empresa: el backend responde siempre el
 * de la empresa ACTIVA, y el de una no debe servir para otra (un superusuario
 * que cambia de empresa, EC-847).
 */
export const fiscalAddressQueryKey = (companyId: number | null) =>
  ["fiscal-address", companyId] as const;

/**
 * Domicilio fiscal de la empresa de la sesión (EC-860), leído del backend.
 * Apagado sin empresa confirmada (`companyId` `null`): no hay de cuál leerlo.
 * `fiscalAddress` es `undefined` mientras no ha cargado.
 */
export const useCompanyFiscalAddress = () => {
  const companyId = useSessionCompanyId();
  const { data, isLoading, isInitialError, refetch } = useGuardedQuery(
    {
      queryKey: fiscalAddressQueryKey(companyId),
      queryFn: ({ signal }) => getFiscalAddress(signal),
      enabled: companyId !== null,
    },
    { toastId: "fiscal-address-refetch-error" },
  );

  return {
    companyId,
    fiscalAddress: data,
    isLoading,
    isInitialError,
    refetch,
  };
};
