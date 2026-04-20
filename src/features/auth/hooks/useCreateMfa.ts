import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MfaCreateResponse } from "../interfaces/auth.interface";
import { createMfa } from "../services/actions";

export const useCreateMfa = () =>
  useMutation<MfaCreateResponse, unknown, void>({
    mutationKey: ["auth", "mfa", "create"],
    mutationFn: () => createMfa(),
    retry: 0,
    onError: () => {
      toast.error("No se pudo configurar la autenticación. Inténtalo de nuevo más tarde.");
    },
  });
