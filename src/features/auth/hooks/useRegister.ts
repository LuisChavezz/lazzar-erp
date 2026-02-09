import { useMutation } from "@tanstack/react-query";
import { register } from "../services/actions";
import { RegisterFormValues } from "../interfaces/register.interface";
import { RegisterSchemaType } from "../schemas/register.schema";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export const useRegister = () => {
  const router = useRouter();
  const { update } = useSession();

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterSchemaType) => {
      // Ensure optional fields are strings as expected by the API interface
      const payload: RegisterFormValues = {
        ...data
      };
      return register(payload);
    },
    onSuccess: async (data, variables) => {
      toast.success("Registro exitoso");
      
      try {
        // Auto login after registration
        const result = await signIn("credentials", {
          email: variables.usuario_email,
          password: variables.usuario_password,
          redirect: false,
        });

        // Handle login errors
        if (result?.error) {
          toast.error("Error al iniciar sesión automáticamente. Por favor ingresa manualmente.");
          router.push("/auth/login");

        } else { // Successful login
          await update();
          router.refresh();
          router.push("/config");
        }
      } catch (error) { // Handle login error
        console.error("Auto login error:", error);
        toast.error("Error al iniciar sesión");
        router.push("/auth/login");
      }
    },
    onError: () => {
      console.error("Registration error:");
      const errorMessage = "Error al registrar la cuenta";
      toast.error(errorMessage);
    },
  });

  return {
    register: registerMutation.mutate,
    isLoading: registerMutation.isPending,
    isSuccess: registerMutation.isSuccess,
    isError: registerMutation.isError,
    error: registerMutation.error,
  };
};
