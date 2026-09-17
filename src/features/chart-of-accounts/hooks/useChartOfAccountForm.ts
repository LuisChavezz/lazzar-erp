"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import {
  ChartOfAccountFormSchema,
  createEmptyChartOfAccountForm,
  type ChartOfAccountFormValues,
} from "../schemas/chart-of-account.schema";
import type {
  CuentaContable,
  CuentaContableCreate,
} from "../interfaces/chart-of-account.interface";
import { useCreateChartOfAccount } from "./useCreateChartOfAccount";
import { useUpdateChartOfAccount } from "./useUpdateChartOfAccount";
import type { ChartOfAccountFormField } from "./setChartOfAccountFieldErrors";

interface UseChartOfAccountFormParams {
  onSuccess: () => void;
  cuentaToEdit?: CuentaContable | null;
}

/**
 * Valores del formulario a partir de la cuenta en edición. `nivel` viaja como
 * TEXTO en el formulario (ver el esquema) y `codigo` puede llegar vacío en
 * registros antiguos: se muestra tal cual y el esquema pedirá capturarlo.
 */
const valuesFromCuenta = (cuenta: CuentaContable): ChartOfAccountFormValues => ({
  codigo: cuenta.codigo ?? "",
  nombre: cuenta.nombre ?? "",
  tipo: cuenta.tipo,
  nivel: String(cuenta.nivel ?? 1),
  acepta_movimientos: cuenta.acepta_movimientos,
});

/**
 * Formulario de alta y edición de una cuenta contable.
 *
 * Los errores de CLIENTE (Zod) y de SERVIDOR (el 400 por campo) se guardan por
 * separado y `getError` da prioridad al del servidor: es el más reciente y el
 * que el usuario acaba de provocar. Editar el campo limpia los dos.
 *
 * NO sincroniza valores con un efecto: quien lo monta le pasa un `key` que
 * distingue alta de edición y la cuenta concreta, así que cambiar de registro
 * REMONTA el componente y los valores iniciales se leen de cero. Eso evita el
 * `form.reset` dentro de un `useEffect` que arrastra el precedente de bancos.
 */
export function useChartOfAccountForm({
  onSuccess,
  cuentaToEdit,
}: UseChartOfAccountFormParams) {
  const isEditing = Boolean(cuentaToEdit?.id);

  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [clientErrors, setClientErrors] = useState<
    Partial<Record<ChartOfAccountFormField, string>>
  >({});
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<ChartOfAccountFormField, string>>
  >({});

  // `useState` con inicializador: una sola instancia estable de los valores
  // iniciales, sin memoización manual (el React Compiler está activo). Mismo
  // recurso que `useAccountPayableForm`.
  const [defaultValues] = useState<ChartOfAccountFormValues>(() =>
    cuentaToEdit ? valuesFromCuenta(cuentaToEdit) : createEmptyChartOfAccountForm(),
  );

  const setHookError = (
    field: ChartOfAccountFormField,
    error: { message?: string },
  ) => {
    if (!error.message) return;
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createCuenta, isPending: isCreating } =
    useCreateChartOfAccount(setHookError);
  const { mutateAsync: updateCuenta, isPending: isUpdating } =
    useUpdateChartOfAccount(setHookError);

  /** Editar un campo retira su aviso, venga del cliente o del servidor. */
  const clearFieldErrors = (field: ChartOfAccountFormField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  /** Valida UN campo (en blur) contra su propio esquema. */
  const validateField = (
    field: ChartOfAccountFormField,
    value: ChartOfAccountFormValues[ChartOfAccountFormField],
  ) => {
    const parsed = ChartOfAccountFormSchema.shape[field].safeParse(value);
    if (parsed.success) {
      setClientErrors((prev) => {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    }
    const message = parsed.error.issues[0]?.message ?? "Valor inválido";
    setClientErrors((prev) => ({ ...prev, [field]: message }));
    return false;
  };

  const getError = (field: ChartOfAccountFormField): FormFieldError | undefined => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? { message } : undefined;
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      const parsed = ChartOfAccountFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Partial<Record<ChartOfAccountFormField, string>> = {};
        parsed.error.issues.forEach((issue) => {
          const field = issue.path[0] as ChartOfAccountFormField;
          if (!field || nextErrors[field]) return;
          nextErrors[field] = issue.message;
        });
        setClientErrors(nextErrors);
        // Todos los campos son de primer nivel, así que la llave del error ya es
        // el `name` del control en el DOM.
        scrollToFirstValidationError(formRef.current, Object.keys(nextErrors));
        return;
      }
      setClientErrors({});

      setIsSubmitting(true);
      try {
        // `empresa` NO se envía (la resuelve el backend) y `cuenta_padre`
        // tampoco: al ser PATCH, omitirlo es lo que CONSERVA el padre que la
        // cuenta ya tuviera. `activo` se administra desde la fila.
        const payload: CuentaContableCreate = {
          codigo: parsed.data.codigo.trim().toUpperCase(),
          nombre: parsed.data.nombre.trim(),
          tipo: parsed.data.tipo,
          nivel: Number(parsed.data.nivel),
          acepta_movimientos: parsed.data.acepta_movimientos,
        };

        if (isEditing && cuentaToEdit) {
          await updateCuenta({ id: cuentaToEdit.id, ...payload });
        } else {
          await createCuenta(payload);
        }

        onSuccess();
      } catch {
        // Los errores de campo ya se repartieron en `setHookError` y el toast
        // salió desde la mutación. Se captura para que el rechazo de
        // `mutateAsync` no escape por `void form.handleSubmit()` como unhandled
        // rejection — y, sobre todo, para NO cerrar el diálogo: el usuario tiene
        // que ver el aviso bajo el campo (p. ej. el código duplicado).
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const isPending = isSubmitting || isCreating || isUpdating;

  const handleReset = () => {
    form.reset(defaultValues);
    setClientErrors({});
    setServerErrors({});
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    formRef,
    isPending,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
