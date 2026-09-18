import { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { reactivateEmployee } from "../services/actions";
import { Employee } from "../interfaces/employee.interface";

/**
 * Reactiva un empleado dado de baja (PATCH `activo: true`).
 *
 * Espejo de `useDeleteEmployee` en el sentido contrario: mismo patrón de
 * optimista con snapshot + rollback, y `onSettled` devuelve la promesa de
 * invalidación para que la mutación siga "pending" hasta que llegue el refetch.
 */
export const useReactivateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reactivateEmployee,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["employees"] });
      const previousEmployees = queryClient.getQueryData<Employee[]>(["employees"]);

      // El registro nunca salió del listado: solo cambia su estatus.
      if (previousEmployees) {
        queryClient.setQueryData<Employee[]>(["employees"], (old) =>
          old
            ? old.map((employee) =>
                employee.id === id ? { ...employee, activo: true } : employee
              )
            : []
        );
      }

      return { previousEmployees };
    },
    onError: (err, id, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueryData(["employees"], context.previousEmployees);
      }
      console.error(err);
      // Solo un 400 trae un motivo que mostrar; un 5xx o un fallo de red cae
      // al texto en español (ver `useToggleCostCenterActivo`).
      const drfMessage =
        err instanceof AxiosError && err.response?.status === 400
          ? firstDrfFieldMessage(err)
          : undefined;
      toast.error(
        drfMessage ?? "No se pudo reactivar el empleado. Intenta de nuevo.",
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
    onSuccess: () => {
      toast.success("Empleado reactivado correctamente");
    },
  });
};
