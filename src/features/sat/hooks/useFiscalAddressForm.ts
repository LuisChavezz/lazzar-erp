"use client";

import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { useFormSubmitLock } from "@/src/hooks/useFormSubmitLock";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { FiscalAddressSchema, FiscalAddressFormValues } from "../schemas/fiscal-address.schema";
import { FiscalAddress, FiscalAddressField } from "../interfaces/fiscal-address.interface";
import { fiscalAddressPatch } from "../utils/fiscalAddressForm";
import { useUpdateFiscalAddress } from "./useUpdateFiscalAddress";

interface UseFiscalAddressFormParams {
  /** Empresa de la sesión: la llave de caché donde queda lo guardado. */
  companyId: number | null;
  /** El domicilio recién releído al abrir el diálogo (`useFiscalAddressDialogLoad`). */
  address: FiscalAddress;
  onSuccess: () => void;
}

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

  // La mutación avisa con toast y reparte el error entre campos y banner.
  const { mutateAsync: saveAddress, isPending: isSaving } = useUpdateFiscalAddress(companyId, {
    setFieldError: setServerFieldError,
    setFormError,
  });

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

      // Solo lo que cambió: no pisar lo que otro guardó en los demás campos.
      const patch = fiscalAddressPatch(address, parsed.data);
      if (Object.keys(patch).length === 0) {
        toast("No hay cambios que guardar");
        leavingRef.current = true;
        onSuccess();
        return;
      }

      try {
        await saveAddress(patch);
      } catch {
        // La mutación ya avisó (toast, errores por campo y banner).
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
