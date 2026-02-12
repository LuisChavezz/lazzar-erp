import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser as updateUserService } from "../services/actions";
import { UserFormValues } from "../schemas/user.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { UseFormSetError } from "react-hook-form";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";

interface UpdateUserVariables {
  id: number;
  values: UserFormValues;
}

export const useUpdateUser = (setError?: UseFormSetError<UserFormValues>) => {
  const queryClient = useQueryClient();
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);

  return useMutation({
    mutationKey: ["update-user"],
    mutationFn: ({ id, values }: UpdateUserVariables) =>
      updateUserService(id, {
        ...values,
        empresa: companyId!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario actualizado correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError && setError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const validationErrors = data as Record<string, string[]>;

          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof UserFormValues;
            const errorMessages = validationErrors[key];

            if (errorMessages && errorMessages.length > 0) {
              setError(fieldKey, {
                type: "server",
                message: errorMessages[0],
              });
            }
          });
        } else {
          toast.error("Error al actualizar el usuario");
        }
      } else {
        toast.error("Ocurrió un error inesperado");
      }
    },
  });
}
