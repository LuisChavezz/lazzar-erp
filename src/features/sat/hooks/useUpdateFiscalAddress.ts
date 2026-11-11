import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateFiscalAddress } from "../services/actions";
import { FiscalAddress, FiscalAddressField } from "../interfaces/fiscal-address.interface";
import { routeFiscalAddressSaveError } from "../utils/fiscalAddressForm";
import { fiscalAddressQueryKey } from "./useCompanyFiscalAddress";

interface UpdateFiscalAddressErrorHandlers {
  /** Error del backend en un campo del formulario: va bajo su input. */
  setFieldError?: (field: FiscalAddressField, message: string) => void;
  /** Rechazo que no es de un campo (o `null`): va al banner del formulario. */
  setFormError?: (message: string | null) => void;
}

/**
 * Guarda el domicilio fiscal de la empresa activa con `PATCH` (EC-860): solo
 * los campos cambiados (`fiscalAddressPatch`). Escribe la respuesta (el
 * domicilio completo ya guardado, normalizado por el backend) en la caché de
 * `companyId`. Avisa con toast; el reparto entre campos y banner llega al
 * formulario por los callbacks (`routeFiscalAddressSaveError`).
 */
export const useUpdateFiscalAddress = (
  companyId: number | null,
  { setFieldError, setFormError }: UpdateFiscalAddressErrorHandlers = {},
) => {
  const queryClient = useQueryClient();

  return useMutation<FiscalAddress, unknown, Partial<FiscalAddress>>({
    mutationFn: (payload) => updateFiscalAddress(payload),
    onSuccess: (saved) => {
      queryClient.setQueryData(fiscalAddressQueryKey(companyId), saved);
      toast.success("Dirección fiscal guardada");
    },
    onError: (error) => {
      const { fieldErrors, formError, toastMessage } = routeFiscalAddressSaveError(error);
      for (const [field, message] of Object.entries(fieldErrors)) {
        setFieldError?.(field as FiscalAddressField, message);
      }
      setFormError?.(formError);
      toast.error(toastMessage);
    },
  });
};
