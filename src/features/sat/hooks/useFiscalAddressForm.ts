"use client";

import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { useFormSubmitLock } from "@/src/hooks/useFormSubmitLock";
import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { FiscalAddressSchema, FiscalAddressFormValues } from "../schemas/fiscal-address.schema";
import {
  FISCAL_ADDRESS_FIELDS,
  FiscalAddress,
  FiscalAddressField,
} from "../interfaces/fiscal-address.interface";
import { useUpdateFiscalAddress } from "./useUpdateFiscalAddress";

interface UseFiscalAddressFormParams {
  /** Empresa de la sesión: la llave de caché donde queda lo guardado. */
  companyId: number | null;
  /** El domicilio tal como estaba al abrir el diálogo. */
  address: FiscalAddress;
  onSuccess: () => void;
}

const SAVE_FALLBACK = "No se pudo guardar la dirección fiscal";

export function useFiscalAddressForm({ companyId, address, onSuccess }: UseFiscalAddressFormParams) {
  const formRef = useRef<HTMLFormElement | null>(null);
  // Marca de salida del candado (`useFormSubmitLock`): tras guardar, el diálogo
  // se cierra pero el formulario sigue montado durante la animación.
  const leavingRef = useRef(false);

  // Rechazo que no es de un campo: el 403 de quien no es admin o el 400 de un
  // usuario sin empresa activa (`{"empresa": "..."}`).
  const [formError, setFormError] = useState<string | null>(null);

  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    replaceClientErrors,
    clearServerErrors,
    clearAllErrors,
  } = useFormFieldErrors<FiscalAddressField>();

  const { mutateAsync: saveAddress, isPending: isSaving } = useUpdateFiscalAddress(companyId);

  const form = useForm({
    defaultValues: address satisfies FiscalAddressFormValues,
    onSubmit: async ({ value }) => {
      clearServerErrors();
      setFormError(null);

      const parsed = FiscalAddressSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Partial<Record<FiscalAddressField, string>> = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as FiscalAddressField;
          if (field && !nextErrors[field]) nextErrors[field] = issue.message;
        }
        replaceClientErrors(nextErrors);
        scrollToFirstValidationError(formRef.current, Object.keys(nextErrors));
        return;
      }
      replaceClientErrors({});

      try {
        await saveAddress(parsed.data);
      } catch (error) {
        // Cada error de campo va bajo su input (p. ej. los dos mensajes del CP).
        // Lo que no es de un campo va al banner; si solo hubo errores de campo,
        // el banner sobra y basta el toast genérico.
        let hasFieldError = false;
        const message = handleDrfWriteError(error, SAVE_FALLBACK, FISCAL_ADDRESS_FIELDS, (field, text) => {
          hasFieldError = true;
          setServerFieldError(field, text);
        });
        if (!hasFieldError || message !== SAVE_FALLBACK) setFormError(message);
        toast.error(message);
        return;
      }

      leavingRef.current = true;
      clearAllErrors();
      onSuccess();
    },
  });

  const { handleFormSubmit, isSubmitLocked, isFormSubmitting } = useFormSubmitLock(form, {
    leavingRef,
  });

  // Valida un campo al perder el foco; el error del servidor se va al editarlo.
  const validateField = (field: FiscalAddressField, value: string) => {
    const parsed = FiscalAddressSchema.shape[field].safeParse(value);
    if (parsed.success) {
      clearClientFieldError(field);
      return true;
    }
    setClientFieldError(field, parsed.error.issues[0]?.message ?? "Valor inválido");
    return false;
  };

  // Vuelve a los valores con los que se abrió el diálogo.
  const handleReset = () => {
    if (isSubmitLocked()) return;
    form.reset();
    clearAllErrors();
    setFormError(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return {
    form,
    formRef,
    isSubmitting: isSaving || isFormSubmitting,
    formError,
    getError,
    // Editar un campo quita sus errores, de cliente y de servidor.
    clearFieldError: clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
