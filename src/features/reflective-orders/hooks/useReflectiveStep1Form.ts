"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { useSession } from "next-auth/react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import {
  CreateReflectiveOrderFormSchema,
  type CreateReflectiveOrderFormValues,
} from "../schemas/reflective-order.schema";
import { useReflectiveOnboarding } from "./useReflectiveOnboarding";
import { resolveAssignedOperator } from "../utils/resolveAssignedOperator";

interface UseReflectiveStep1FormParams {
  /**
   * Encabezado ya capturado, propiedad de `ReflectiveOrderStepManager`. Al
   * "Regresar" desde el Paso 2 llega de vuelta con lo que el usuario había
   * elegido, así que el paso se repuebla solo.
   */
  initialValues: CreateReflectiveOrderFormValues;
  onNext: (values: CreateReflectiveOrderFormValues) => void;
}

/**
 * Paso 1 del alta de orden de reflejante: encabezado (pedido, prioridad,
 * observaciones). NO envía nada al backend — solo valida y entrega el
 * encabezado al orquestador, igual que `useEmbroideryStep1Form`.
 *
 * De ahí que aquí ya no vivan la mutación, el banner de error del servidor ni el
 * bloque de duplicado que tenía `useReflectiveOrderForm` (el hook del alta de un
 * solo paso, retirado): el único punto de envío es el Paso 2, y con él se fueron
 * el reparto de errores del backend y la guarda de doble envío (ver
 * `useReflectiveStep2Form`).
 *
 * `prioridad` arranca en `1`, que es el default del propio backend
 * (`IntegerField(default=1)`): omitir el campo produciría exactamente el mismo
 * valor almacenado, así que preseleccionarlo muestra la verdad en vez de fingir
 * que "sin elegir" es un estado posible. Ojo con la consecuencia: bajo la
 * convención de etiquetas del proyecto ese `1` se lee "Alta", de modo que el
 * default efectivo de TODA orden de reflejante es prioridad Alta — es una
 * herencia del backend (la generación automática desde ventas también escribe
 * `prioridad=1`), no una decisión de esta pantalla.
 */
export function useReflectiveStep1Form({
  initialValues,
  onNext,
}: UseReflectiveStep1FormParams) {
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
  } = useReflectiveOnboarding();

  /**
   * Solo es error "de pantalla completa" cuando el catálogo NUNCA cargó. Un
   * refetch fallido con datos en caché conserva el formulario —y con él las
   * observaciones ya tecleadas, que viven en el estado de TanStack Form dentro
   * del componente— y avisa por toast desde `useReflectiveOnboarding`. Sin
   * esto, volver del Paso 2 remonta este paso, y un fallo de red en ese refetch
   * cambiaba el formulario por un panel de error. Mismo criterio que
   * `ReflectiveOrdersView`.
   */
  const isErrorCatalog = isInitialLoadError(isError, hasLoaded);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Opciones derivadas ───────────────────────────────────────────────────
  const pedidoOptions = useMemo(
    () =>
      pedidos.map((pedido) => ({
        value: pedido.id,
        // `folio` es nullable en el modelo: sin él, el id es lo único que
        // identifica al pedido en la lista.
        label: [pedido.folio ?? `Pedido #${pedido.id}`, pedido.cliente_nombre]
          .filter(Boolean)
          .join(" — "),
      })),
    [pedidos],
  );

  /** Operador que quedará asignado: siempre el usuario autenticado. */
  const operadorAsignado = useMemo(
    () => resolveAssignedOperator(operadores, session?.user),
    [operadores, session?.user],
  );

  // ─── Helpers de errores ───────────────────────────────────────────────────
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

  // ─── Formulario ───────────────────────────────────────────────────────────
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: ({ value }) => {
      const parsed = CreateReflectiveOrderFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        return;
      }

      // El pedido tiene que seguir existiendo en el catálogo RECIÉN cargado:
      // uno que otra orden acabó de cubrir al 100% desaparece de la respuesta
      // del onboarding, y avanzar con él dejaría el Paso 2 sin líneas que
      // mostrar. Mismo guard que `useEmbroideryStep1Form`.
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
