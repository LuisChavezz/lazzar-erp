"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { useSession } from "next-auth/react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { buildWorkOrderPedidoOptions } from "@/src/utils/formatWorkOrderProgramado";
import {
  CreateCorteMangaOrderFormSchema,
  type CreateCorteMangaOrderFormValues,
} from "../schemas/corte-manga-order.schema";
import { useCorteMangaOnboarding } from "./useCorteMangaOnboarding";
import { resolveAssignedOperator } from "../utils/resolveAssignedOperator";

interface UseCorteMangaStep1FormParams {
  /**
   * Encabezado ya capturado, propiedad de `CorteMangaOrderStepManager`. Al
   * "Regresar" desde el Paso 2 llega de vuelta con lo que el usuario había
   * elegido, así que el paso se repuebla solo.
   */
  initialValues: CreateCorteMangaOrderFormValues;
  onNext: (values: CreateCorteMangaOrderFormValues) => void;
}

/**
 * Paso 1 del alta de orden de corte de manga: encabezado (pedido y
 * observaciones). NO envía nada al backend — solo valida y entrega el
 * encabezado al orquestador, igual que `useReflectiveStep1Form`.
 *
 * El único punto de envío es el Paso 2, y con él viven el reparto de errores
 * del backend, el aviso de duplicado y la guarda de doble envío (ver
 * `useCorteMangaStep2Form`).
 */
export function useCorteMangaStep1Form({ initialValues, onNext }: UseCorteMangaStep1FormParams) {
  const { data: session } = useSession();
  const {
    pedidos,
    operadores,
    folioPreview,
    hasLoaded,
    isLoading: isLoadingCatalog,
    isError,
    error: catalogError,
    refetch: refetchCatalog,
  } = useCorteMangaOnboarding();

  /**
   * Solo es error "de pantalla completa" cuando el catálogo NUNCA cargó. Un
   * refetch fallido con datos en caché conserva el formulario —y con él las
   * observaciones ya tecleadas— y avisa por toast desde
   * `useCorteMangaOnboarding`. Volver del Paso 2 remonta este paso, y un fallo
   * de red en ese refetch no debe cambiar el formulario por un panel de error.
   */
  const isErrorCatalog = isInitialLoadError(isError, hasLoaded);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const pedidoOptions = useMemo(() => buildWorkOrderPedidoOptions(pedidos), [pedidos]);

  /** Operador que quedará asignado: siempre el usuario autenticado. */
  const operadorAsignado = useMemo(
    () => resolveAssignedOperator(operadores, session?.user),
    [operadores, session?.user],
  );

  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  const clearError = (path: string) => {
    setErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: ({ value }) => {
      const parsed = CreateCorteMangaOrderFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        return;
      }

      // El pedido tiene que seguir existiendo en el catálogo RECIÉN cargado: uno
      // que otra orden acabó de cubrir desaparece de la respuesta del
      // onboarding, y avanzar con él dejaría el Paso 2 sin líneas que mostrar.
      const pedido = pedidos.find((option) => option.id === parsed.data.pedido);
      if (!pedido) {
        setErrors((prev) => ({ ...prev, pedido: "Selecciona un pedido" }));
        return;
      }

      setErrors({});
      onNext(parsed.data);
    },
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    pedidoOptions,
    operadorAsignado,
    folioPreview,
    isLoadingCatalog,
    isErrorCatalog,
    catalogError,
    refetchCatalog,
    getError,
    clearError,
    handleFormSubmit,
  };
}
