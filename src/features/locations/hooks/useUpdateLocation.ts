import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateLocation } from "../services/actions";
import { LocationCreate } from "../interfaces/location.interface";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { UseFormSetError } from "react-hook-form";

interface UpdateLocationPayload extends LocationCreate {
  id_ubicacion: number;
}

export const useUpdateLocation = (setError?: UseFormSetError<LocationCreate>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id_ubicacion, ...values }: UpdateLocationPayload) =>
      updateLocation(id_ubicacion, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Ubicación actualizada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof LocationCreate;
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
      toast.error("Error al actualizar la ubicación");
    },
  });
};
