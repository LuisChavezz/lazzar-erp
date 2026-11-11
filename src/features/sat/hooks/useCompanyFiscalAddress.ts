import { useSessionCompanyId } from "@/src/features/workspace/hooks/useSessionCompany";
import { useSatStore } from "../stores/sat.store";
import { fiscalAddressForCompany } from "../utils/fiscalAddressStorage";

/**
 * Dirección fiscal de la empresa de la sesión (EC-847): una por empresa.
 * `companyId` es `null` sin empresa confirmada; entonces no hay dirección que
 * mostrar ni que guardar.
 */
export const useCompanyFiscalAddress = () => {
  const companyId = useSessionCompanyId();
  const addressesByCompany = useSatStore((state) => state.addressesByCompany);
  const setFiscalAddress = useSatStore((state) => state.setFiscalAddress);

  return {
    companyId,
    fiscalAddress: fiscalAddressForCompany(addressesByCompany, companyId),
    setFiscalAddress,
  };
};
