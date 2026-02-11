import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBranch } from "../services/actions";
import { BranchFormValues } from "../schemas/branch.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { UseFormSetError } from "react-hook-form";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";

export const useUpdateBranch = (setError?: UseFormSetError<BranchFormValues>) => {
  const queryClient = useQueryClient();

  // Get the selected company ID and update branch method from the workspace store
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);
  const updateWorkspaceBranch = useWorkspaceStore((state) => state.updateBranch);

  // Update branch mutation
  return useMutation({
    mutationKey: ["update-branch"],
    mutationFn: (values: BranchFormValues) => updateBranch({
      ...values,
      empresa: companyId!,
    }),

    // Handle success
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["my-branches"] });
      
      // Normalize data to ensure id is present (API might return id_sucursal but not id)
      const normalizedBranch = {
        ...data,
        id: data.id || data.id_sucursal,
      };

      if (normalizedBranch.id) {
        updateWorkspaceBranch(normalizedBranch);
      }
      
      toast.success("Sucursal actualizada correctamente");
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
      toast.error("Error al actualizar la sucursal");
    }
  });
};
