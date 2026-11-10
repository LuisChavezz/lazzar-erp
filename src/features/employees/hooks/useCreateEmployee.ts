import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { useSessionCompanyId } from "@/src/features/workspace/hooks/useSessionCompany";
import { createEmployee } from "../services/actions";
import { EmployeeCreate } from "../interfaces/employee.interface";
import { EmployeeServerErrorField } from "../schemas/employee.schema";

type SetEmployeeError = (
  field: EmployeeServerErrorField,
  error: { type?: string; message?: string }
) => void;

export const useCreateEmployee = (setError?: SetEmployeeError) => {
  const queryClient = useQueryClient();

  // La empresa no se captura en el formulario: se toma de la sesión (EC-842),
  // igual que en el alta de puestos y de sucursales.
  const companyId = useSessionCompanyId();

  return useMutation({
    mutationFn: (values: EmployeeCreate) =>
      createEmployee({ ...values, empresa: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Empleado registrado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as EmployeeServerErrorField;
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
      toast.error("Error al registrar el empleado");
    },
  });
};
