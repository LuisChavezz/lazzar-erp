import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateFiscalAddress } from "../services/actions";
import { FiscalAddress } from "../interfaces/fiscal-address.interface";
import { fiscalAddressQueryKey } from "./useCompanyFiscalAddress";

/**
 * Guarda el domicilio fiscal de la empresa activa con `PATCH` (EC-860) y
 * escribe la respuesta (el domicilio ya guardado, normalizado por el backend)
 * en la caché de `companyId`.
 *
 * Los errores no se avisan aquí: el formulario los reparte entre sus campos y
 * su banner (ver `useFiscalAddressForm`).
 */
export const useUpdateFiscalAddress = (companyId: number | null) => {
  const queryClient = useQueryClient();

  return useMutation<FiscalAddress, unknown, FiscalAddress>({
    mutationFn: (payload) => updateFiscalAddress(payload),
    onSuccess: (saved) => {
      queryClient.setQueryData(fiscalAddressQueryKey(companyId), saved);
      toast.success("Dirección fiscal guardada");
    },
  });
};
