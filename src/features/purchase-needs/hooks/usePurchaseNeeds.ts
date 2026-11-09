import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { createdOcFolio, createOcFromNeeds, getNeedGroups } from "../services/actions";

/**
 * Necesidades agrupadas por material. Llave `["purchase-needs", "grouped"]`.
 * Cambian desde otras sesiones (almacén confirma, se reciben OC), así que se
 * refrescan al montar y al enfocar.
 */
export const usePurchaseNeedGroups = () => {
  const { data, hasLoaded, isLoading, isFetching, isInitialError, refetch } = useGuardedQuery(
    {
      queryKey: ["purchase-needs", "grouped"],
      queryFn: getNeedGroups,
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
    { toastId: "purchase-needs-refetch-error" },
  );
  return { groups: data ?? [], hasLoaded, isLoading, isFetching, isInitialError, refetch };
};

/** Crea UNA OC consolidada. Llave fija: un solo envío a la vez. */
export const useCreateOcFromNeeds = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["create-oc-from-needs"],
    mutationFn: createOcFromNeeds,
    onSuccess: (res) => {
      toast.success(
        createdOcFolio(res)
          ? `Orden de compra ${createdOcFolio(res)} creada en borrador.`
          : "Orden de compra creada en borrador.",
      );
      return Promise.all(
        ["purchase-needs", "purchase-orders", "pre-orders"].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },
    onError: (error) =>
      toast.error(
        firstDrfFieldMessage(error) ??
          extractErrorMessage(error, "No se pudo crear la orden de compra."),
      ),
  });
};
