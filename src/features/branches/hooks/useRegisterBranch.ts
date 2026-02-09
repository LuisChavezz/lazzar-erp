import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBranch } from "../services/actions";
import { BranchFormValues } from "../schemas/branch.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { UseFormSetError } from "react-hook-form";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";

export const useRegisterBranch = (setError?: UseFormSetError<BranchFormValues>) => {
  const queryClient = useQueryClient();

  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);

  return useMutation({
    mutationKey: ["register-branch"],
    mutationFn: (values: BranchFormValues) => createBranch({
      ...values,
      empresa: companyId!,
    }),

    // Handle success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["my-branches"] });
      toast.success("Sucursal registrada correctamente");
    },

    // Handle error
    onError: (error) => {
      if (error instanceof AxiosError && setError) { // Handle Axios errors
        const statusCode = error.response?.status;
        const data = error.response?.data;

        // Handle 400 Bad Request with validation errors
        if (statusCode === 400 && data) {
          // Assuming the API returns a similar error structure: { fieldName: ["Error message"] }
          const validationErrors = data as Record<string, string[]>;

          // Iterate over each field in the validation errors
          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof BranchFormValues;
            const errorMessages = validationErrors[key];

            // Verify if the key corresponds to a form field (basic check) and has messages
            if (Array.isArray(errorMessages) && errorMessages.length > 0) {
              setError(fieldKey, {
                type: "server",
                message: errorMessages[0], // Take the first error message
              });
            }
          });
        }
      }
      toast.error("Error al registrar la sucursal");
    }
  });
};
