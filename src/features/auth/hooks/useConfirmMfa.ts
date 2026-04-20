import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import {
  MfaConfirmResponse,
  isMfaConfirmErrorResponse,
} from "../interfaces/auth.interface";
import { confirmMfa } from "../services/actions";

export const useConfirmMfa = () =>
  useMutation<MfaConfirmResponse, unknown, string>({
    mutationKey: ["auth", "mfa", "confirm"],
    mutationFn: (otp: string) => confirmMfa(otp),
    retry: 0,
    onSuccess: (data) => {
      toast.success(data.detail ?? "Autenticación en dos pasos activada correctamente.");
    },
    onError: (error) => {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 400 &&
        isMfaConfirmErrorResponse(error.response.data)
      ) {
        const firstError = error.response.data.non_field_errors[0];
        toast.error(firstError ?? "Código OTP inválido. Verifica e inténtalo de nuevo.");
        return;
      }

      toast.error("No se pudo verificar el código. Inténtalo de nuevo.");
    },
  });