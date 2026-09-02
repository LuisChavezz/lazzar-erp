import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEmployee } from "../services/actions";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Employee } from "../interfaces/employee.interface";

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmployee,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["employees"] });
      const previousEmployees = queryClient.getQueryData<Employee[]>(["employees"]);

      // El DELETE es una baja lógica: el registro NO sale del listado, pasa a
      // `activo: false`. Por eso el optimista marca la fila como inactiva en
      // lugar de filtrarla — filtrarla la hacía desaparecer para volver a
      // aparecer en cuanto el refetch la devolvía.
      if (previousEmployees) {
        queryClient.setQueryData<Employee[]>(["employees"], (old) =>
          old
            ? old.map((employee) =>
                employee.id === id ? { ...employee, activo: false } : employee
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
      toast.error(extractErrorMessage(err, "Error al desactivar el empleado"));
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
    onSuccess: () => {
      toast.success("Empleado desactivado correctamente");
    },
  });
};
