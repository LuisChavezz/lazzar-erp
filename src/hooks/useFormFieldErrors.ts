import { useState } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";

type FieldErrors<F extends string> = Partial<Record<F, string>>;

const withoutField = <F extends string>(errors: FieldErrors<F>, field: F): FieldErrors<F> => {
  if (!(field in errors)) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
};

/**
 * Errores por campo de un formulario, de sus DOS orígenes:
 *
 * - **de cliente**: los de la validación propia (el schema, en blur y al
 *   enviar);
 * - **de servidor**: los que devuelve el backend por campo al guardar (ver
 *   `handleDrfWriteError`, que los pinta con `setServerFieldError`).
 *
 * Se guardan aparte porque se limpian en momentos distintos —los de servidor al
 * empezar cada envío, los de cliente al revalidar—, y al mostrarlos gana el de
 * servidor: es la respuesta más reciente sobre ese campo. Editar un campo quita
 * los dos suyos (`clearFieldErrors`).
 *
 * `F` son los nombres de campo del formulario. Las reglas que no son de un
 * campo (un aviso que depende de varios) las lleva cada formulario por su
 * cuenta.
 *
 * `initialServerErrors` (opcional) siembra los de servidor al montar: para un
 * formulario que se vuelve a montar con la respuesta de un envío que ocurrió
 * en otro lado (p. ej. el paso siguiente de un wizard). Solo se lee al montar.
 */
export function useFormFieldErrors<F extends string>(initialServerErrors?: FieldErrors<F>) {
  const [clientErrors, setClientErrors] = useState<FieldErrors<F>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<F>>(
    () => initialServerErrors ?? {},
  );

  return {
    /** El error a mostrar bajo el campo (el de servidor gana), o `undefined`. */
    getError: (field: F): FormFieldError | undefined => {
      const message = serverErrors[field] ?? clientErrors[field];
      return message ? ({ message } as FormFieldError) : undefined;
    },
    setServerFieldError: (field: F, message: string) => {
      setServerErrors((prev) => ({ ...prev, [field]: message }));
    },
    setClientFieldError: (field: F, message: string) => {
      setClientErrors((prev) => (prev[field] === message ? prev : { ...prev, [field]: message }));
    },
    clearClientFieldError: (field: F) => {
      setClientErrors((prev) => withoutField(prev, field));
    },
    /** El campo cambió: se van sus errores, de cliente y de servidor. */
    clearFieldErrors: (field: F) => {
      setClientErrors((prev) => withoutField(prev, field));
      setServerErrors((prev) => withoutField(prev, field));
    },
    /** Resultado de validar el formulario completo: sustituye los de cliente. */
    replaceClientErrors: (errors: FieldErrors<F>) => setClientErrors(errors),
    /** Al empezar un envío: los de la respuesta anterior ya no aplican. */
    clearServerErrors: () => setServerErrors({}),
    clearAllErrors: () => {
      setClientErrors({});
      setServerErrors({});
    },
  };
}
