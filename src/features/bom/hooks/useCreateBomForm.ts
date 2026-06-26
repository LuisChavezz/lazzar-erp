"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import {
  ListaMaterialFormSchema,
  type ListaMaterialFormValues,
} from "@/src/features/bom/schemas/bom.schema";
import { useCreateListaMaterial } from "@/src/features/bom/hooks/useCreateListaMaterial";

interface UseCreateBomFormParams {
  /** Variant selected in Step 1 — becomes `producto_variante`. */
  productoVarianteId: number;
  /** Product ids selected in Step 2 — one `materia_prima_detalle` row each. */
  componentIds: number[];
  /** Called after the lista de materiales is created successfully. */
  onSuccess: () => void;
}

/**
 * useCreateBomForm
 *
 * Encapsulates all TanStack Form logic for creating a lista de materiales.
 * Mirrors the project's form convention: `useForm` with plain `defaultValues`,
 * manual Zod validation via `safeParse` on submit, and a `getError` helper that
 * returns a {@link FormFieldError} for the shared form primitives.
 *
 * Validation errors are keyed by their Zod issue path joined with "." — e.g.
 * `materia_prima_detalle.0.cantidad` — so per-item fields can look up their own
 * error.
 */
export function useCreateBomForm({
  productoVarianteId,
  componentIds,
  onSuccess,
}: UseCreateBomFormParams) {
  // Empresa activa — mismo patrón que el resto de formularios.
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);

  const { mutateAsync: createListaMaterial, isPending } =
    useCreateListaMaterial();

  // Errores de validación cliente, indexados por ruta ("a.0.b").
  const [errors, setErrors] = useState<Record<string, string>>({});

  const form = useForm({
    defaultValues: {
      empresa: selectedCompany.id ?? 0,
      producto_variante: productoVarianteId,
      variante_produccion: null,
      version: 1,
      observaciones: "",
      materia_prima_detalle: componentIds.map((componente) => ({
        variante_produccion: null,
        componente,
        cantidad: 1,
        unidad: 0,
        obligatorio: false,
        observaciones: "",
      })),
    } as ListaMaterialFormValues,
    onSubmit: async ({ value }) => {
      const parsed = ListaMaterialFormSchema.safeParse(value);

      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) {
            nextErrors[key] = issue.message;
          }
        });
        setErrors(nextErrors);
        return;
      }

      setErrors({});

      try {
        await createListaMaterial(parsed.data);
        onSuccess();
      } catch {
        // El toast de error lo maneja el hook de mutación.
      }
    },
  });

  // Entrega el error de un campo (por ruta) en el shape que esperan los
  // componentes de formulario compartidos.
  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  // Limpia el error de un campo cuando su valor cambia.
  const clearError = (path: string) => {
    setErrors((prev) => {
      if (!(path in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  // Delega el submit del <form> en TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    isSubmitting: isPending,
    getError,
    clearError,
    handleFormSubmit,
  };
}
