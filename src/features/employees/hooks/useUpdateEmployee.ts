import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { updateEmployee } from "../services/actions";
import { EmployeePayload } from "../interfaces/employee.interface";
import { EmployeeFormValues } from "../schemas/employee.schema";

// En edición la empresa viaja tal cual la trae el registro: no debe
// reasignarse por el workspace activo del usuario.
interface UpdateEmployeePayload extends EmployeePayload {
  id: number;
}

type SetEmployeeError = (
  field: keyof EmployeeFormValues,
  error: { type?: string; message?: string }
) => void;

export const useUpdateEmployee = (setError?: SetEmployeeError) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...values }: UpdateEmployeePayload) => updateEmployee(id, values),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.setQueryData(["employees", updated.id], updated);
      toast.success("Empleado actualizado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof EmployeeFormValues;
            const errorMessages = validationErrors[key];

            if (Array.isArray(errorMessages) && errorMessages.length > 0) {
              setError(fieldKey, {
                type: "server",
                message: errorMessages[0],
              });
            }
          });
        }
      }
      toast.error("Error al actualizar el empleado");
    },
  });
};
