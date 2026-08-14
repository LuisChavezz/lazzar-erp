import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEmployee } from "../services/actions";
import toast from "react-hot-toast";
import { Employee } from "../interfaces/employee.interface";

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmployee,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["employees"] });
      const previousEmployees = queryClient.getQueryData<Employee[]>(["employees"]);

      if (previousEmployees) {
        queryClient.setQueryData<Employee[]>(["employees"], (old) =>
          old ? old.filter((employee) => employee.id !== id) : []
        );
      }

      return { previousEmployees };
    },
    onError: (err, id, context) => {
      if (context?.previousEmployees) {
        queryClient.setQueryData(["employees"], context.previousEmployees);
      }
      console.error(err);
      toast.error("Error al eliminar el empleado");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onSuccess: () => {
      toast.success("Empleado eliminado correctamente");
    },
  });
};
