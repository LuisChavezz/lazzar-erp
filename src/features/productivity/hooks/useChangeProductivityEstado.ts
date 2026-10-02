import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateProductivityEstado } from "../services/actions";
import { ESTADO_CONFIRMADO } from "../constants/productivityChoices";
import { ProductivityEstadoVariables } from "../interfaces/productivity.interface";
import { PRODUCTIVITY_KEY } from "./useProductivity";
import { productivityActionErrorMessage } from "./productivityErrorMessages";

/** Clave de la mutación: alimenta el "en vuelo" por fila (`usePendingProductivityIds`). */
export const changeProductivityEstadoMutationKey = ["change-productivity-estado"] as const;

/**
 * Confirmar (`borrador` → `confirmado`) o devolver a borrador (`confirmado` →
 * `borrador`): `PATCH {estado}`. Sin optimista, como `useApproveAbsence`: se
 * espera la respuesta y se invalida el listado, también tras un error.
 */
export const useChangeProductivityEstado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: changeProductivityEstadoMutationKey,
    mutationFn: ({ id, estado }: ProductivityEstadoVariables) =>
      updateProductivityEstado(id, estado),
    onSuccess: (_data, { estado }) => {
      toast.success(
        estado === ESTADO_CONFIRMADO
          ? "Registro de productividad confirmado"
          : "Registro de productividad devuelto a borrador"
      );
    },
    onError: (error, { estado }) => {
      console.error(error);
      toast.error(
        productivityActionErrorMessage(
          error,
          estado === ESTADO_CONFIRMADO
            ? "No se pudo confirmar el registro. Intenta de nuevo."
            : "No se pudo devolver el registro a borrador. Intenta de nuevo."
        )
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PRODUCTIVITY_KEY }),
  });
};
