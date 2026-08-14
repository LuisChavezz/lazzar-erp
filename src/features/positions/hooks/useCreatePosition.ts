import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { createPosition } from "../services/actions";
import { PositionCreate } from "../interfaces/position.interface";
import { PositionFormValues } from "../schemas/position.schema";

type SetPositionError = (
  field: keyof PositionFormValues,
  error: { type?: string; message?: string }
) => void;

export const useCreatePosition = (setError?: SetPositionError) => {
  const queryClient = useQueryClient();

  // La empresa no se captura en el formulario: se toma del workspace activo,
  // igual que en el alta de sucursales (useRegisterBranch).
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);

  return useMutation({
    mutationFn: (values: PositionCreate) =>
      createPosition({ ...values, empresa: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      toast.success("Puesto registrado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof PositionFormValues;
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
      toast.error("Error al registrar el puesto");
    },
  });
};
