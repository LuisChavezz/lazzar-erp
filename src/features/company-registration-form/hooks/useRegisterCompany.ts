import { useMutation } from "@tanstack/react-query";
import { registerCompany } from "../services/actions";
import { CompanyFormValues } from "../schemas/companiesFormSchema";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const useRegisterCompany = () => {
  return useMutation({
    mutationKey: ["register-company"],
    mutationFn: (values: CompanyFormValues) => registerCompany(values),

    // Handle success
    onSuccess: () => {
      toast.success("Empresa registrada correctamente");
    },

    // Handle error
    onError: (error) => {
      let message = "Ocurrió un error al registrar la empresa";
      
      if (error instanceof AxiosError) { // Handle Axios errors
        const statusCode = error.response?.status;
        const apiMessage = error.response?.data?.message;

        if (apiMessage) {
          message = statusCode
            ? `${apiMessage} (${statusCode})`
            : apiMessage;
        
        } else { // Axios default message
          message = error.message;
        }
      }

      toast.error(message);
    }
  });
};
