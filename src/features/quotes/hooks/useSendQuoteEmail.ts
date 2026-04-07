"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { sendQuoteEmail } from "../services/email.actions";

export const sendQuoteEmailMutationKey = ["send-quote-email"] as const;

export const useSendQuoteEmail = () => {
  return useMutation({
    mutationKey: sendQuoteEmailMutationKey,
    mutationFn: (quoteId: number) => sendQuoteEmail(quoteId),
    onSuccess: (result) => {
      toast.success(`Correo de cotizacion enviado a ${result.recipient.toLocaleLowerCase()}`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "No se pudo enviar el correo de la cotizacion"
      );
    },
  });
};