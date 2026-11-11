import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { completeCompanySwitch } from "@/src/features/auth/utils/companySwitch";
import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import { switchActiveCompany } from "../services/actions";

const SWITCH_ERROR_FALLBACK = "No se pudo cambiar de empresa. Inténtalo de nuevo.";

/**
 * Cambio de empresa activa del superusuario (EC-847). La mutación abarca la
 * petición Y el cierre (`completeCompanySwitch`): sesión, workspace y la
 * navegación a `/select-branch`. Por eso `isBusy` sigue en `true` también tras
 * el éxito, hasta que la página se descarga: el selector no se reactiva en ese
 * intervalo.
 *
 * Un 400 ("Empresa no válida.") o un 403 (no superusuario) llegan por toast con
 * el texto del backend (`handleDrfWriteError`).
 */
export const useSwitchCompany = () => {
  const { update } = useSession();
  const mutation = useMutation({
    mutationKey: ["cambiar-empresa"],
    mutationFn: async (empresa: number) => {
      const user = await switchActiveCompany(empresa);
      await completeCompanySwitch({ empresa: user.empresa, update });
    },
    retry: 0,
    onError: (error) => {
      toast.error(handleDrfWriteError(error, SWITCH_ERROR_FALLBACK, []));
    },
  });

  return {
    /** `onError` corre después del toast (p. ej. para cerrar la confirmación). */
    switchCompany: (empresa: number, options?: { onError?: () => void }) =>
      mutation.mutate(empresa, { onError: () => options?.onError?.() }),
    isBusy: mutation.isPending || mutation.isSuccess,
  };
};
