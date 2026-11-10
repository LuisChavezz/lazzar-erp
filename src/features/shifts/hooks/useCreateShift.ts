import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { useSessionCompanyId } from "@/src/features/workspace/hooks/useSessionCompany";
import { createShift } from "../services/actions";
import { ShiftCreate } from "../interfaces/shift.interface";
import { ShiftFormValues } from "../schemas/shift.schema";

type SetShiftError = (
  field: keyof ShiftFormValues,
  error: { type?: string; message?: string }
) => void;

export const useCreateShift = (setError?: SetShiftError) => {
  const queryClient = useQueryClient();

  // La empresa no se captura en el formulario: se toma de la sesión (EC-842),
  // igual que en el alta de puestos.
  const companyId = useSessionCompanyId();

  return useMutation({
    mutationFn: (values: ShiftCreate) => createShift({ ...values, empresa: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Turno registrado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof ShiftFormValues;
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
      toast.error("Error al registrar el turno");
    },
  });
};
