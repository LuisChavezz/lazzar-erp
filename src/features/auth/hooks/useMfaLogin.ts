import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import {
  isMfaConfirmErrorResponse,
  type MfaLoginPayload,
  type MfaLoginSuccessResponse,
} from "../interfaces/auth.interface";
import { mfaLogin } from "../services/actions";

export const useMfaLogin = () =>
  useMutation<MfaLoginSuccessResponse, unknown, MfaLoginPayload>({
    mutationKey: ["auth", "mfa", "login"],
    mutationFn: (payload) => mfaLogin(payload),
    retry: 0,
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