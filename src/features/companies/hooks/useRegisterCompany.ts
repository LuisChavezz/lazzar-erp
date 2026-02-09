import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registerCompany } from "../services/actions";
import { CompanyFormValues } from "../schemas/companies.schema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { UseFormSetError } from "react-hook-form";
import { RegisterCompanyResponseErrors } from "../interfaces/company.interface";

export const useRegisterCompany = (setError?: UseFormSetError<CompanyFormValues>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["register-company"],
    mutationFn: (values: CompanyFormValues) => registerCompany(values),

    // Handle success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Empresa registrada correctamente");
    },

    // Handle error
    onError: (error) => {
      if (error instanceof AxiosError && setError) { // Handle Axios errors
        const statusCode = error.response?.status;
        const data = error.response?.data;

        // Handle 400 Bad Request with validation errors
        if (statusCode === 400 && data) {
          const validationErrors = data as RegisterCompanyResponseErrors;

          // Iterate over each field in the validation errors
          Object.keys(validationErrors).forEach((key) => {
            const fieldKey = key as keyof CompanyFormValues;
            const errorMessages = (validationErrors as Record<string, string[]>)[key];

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
    }
  });
};
