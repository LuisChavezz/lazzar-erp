"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FieldError } from "react-hook-form";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";
import { useCreateSerieFolio } from "./useCreateSerieFolio";
import { useUpdateSerieFolio } from "./useUpdateSerieFolio";
import { SerieFolio } from "../interfaces/serie-folio.interface";
import { SerieFolioFormSchema, SerieFolioFormValues } from "../schemas/serie-folio.schema";

interface UseSerieFolioFormParams {
  onSuccess: () => void;
  serieFolioToEdit?: SerieFolio | null;
}

type SerieFolioFormField = keyof SerieFolioFormValues;

export function useSerieFolioForm({ onSuccess, serieFolioToEdit }: UseSerieFolioFormParams) {
  // Obtiene empresa y sucursal activa para inicializar el formulario y catálogo de sucursales.
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const selectedBranch = useWorkspaceStore((state) => state.selectedBranch);
  const { branches, isLoading: isLoadingBranches } = useCompanyBranches(selectedCompany.id);

  // Determina si se está editando una serie existente.
  const isEditing = Boolean(serieFolioToEdit?.id_serie_folio);

  // Mantiene separados errores de validación local y de backend.
  const [clientErrors, setClientErrors] = useState<Partial<Record<SerieFolioFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<SerieFolioFormField, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Define estado base para crear nuevas series y folios.
  const emptyValues = useMemo<SerieFolioFormValues>(
    () => ({
      tipo_documento: "",
      serie: "",
      folio_inicial: 1,
      folio_final: 9999,
      prefijo: "",
      sufijo: "",
      relleno_ceros: 4,
      separador: "",
      incluir_anio: false,
      reiniciar_anual: false,
      sucursal: selectedBranch?.id ?? 0,
    }),
    [selectedBranch?.id]
  );

  // Deriva valores para edición a partir de la entidad seleccionada.
  const editValues = useMemo<SerieFolioFormValues>(() => {
    if (!serieFolioToEdit) {
      return emptyValues;
    }

    return {
      tipo_documento: serieFolioToEdit.tipo_documento,
      serie: serieFolioToEdit.serie,
      folio_inicial: serieFolioToEdit.folio_inicial,
      folio_final: serieFolioToEdit.folio_final,
      prefijo: serieFolioToEdit.prefijo ?? "",
      sufijo: serieFolioToEdit.sufijo ?? "",
      relleno_ceros: serieFolioToEdit.relleno_ceros,
      separador: serieFolioToEdit.separador ?? "",
      incluir_anio: serieFolioToEdit.incluir_anio,
      reiniciar_anual: serieFolioToEdit.reiniciar_anual,
      sucursal: serieFolioToEdit.sucursal,
    };
  }, [emptyValues, serieFolioToEdit]);

  // Traduce errores de mutaciones al estado de errores del formulario.
  const setHookError = (field: SerieFolioFormField, error: { message?: string }) => {
    if (!error?.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createSerieFolio, isPending: isCreating } = useCreateSerieFolio(setHookError);
  const { mutateAsync: updateSerieFolio, isPending: isUpdating } = useUpdateSerieFolio(setHookError);

  // Limpia los errores de un campo al actualizar su valor.
  const clearFieldErrors = (field: SerieFolioFormField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Ejecuta validación puntual en blur para el campo modificado.
  const validateField = (field: SerieFolioFormField, value: SerieFolioFormValues[SerieFolioFormField]) => {
    const fieldSchema = SerieFolioFormSchema.shape[field];
    const parsed = fieldSchema.safeParse(value);
    if (parsed.success) {
      setClientErrors((prev) => {
        if (!(field in prev)) {
          return prev;
        }
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

  // Valida todo el formulario antes de enviar y genera mapa de errores por campo.
  const validateForm = (values: SerieFolioFormValues) => {
    const parsed = SerieFolioFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<SerieFolioFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as SerieFolioFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });
    setClientErrors(nextErrors);
    return false;
  };

  // Expone un error unificado por campo priorizando backend sobre cliente.
  const getError = (field: SerieFolioFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FieldError) : undefined;
  };

  // Centraliza submit de creación/edición, limpieza y callbacks.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      setIsLoading(true);
      try {
        if (isEditing && serieFolioToEdit) {
          await updateSerieFolio({
            ...serieFolioToEdit,
            ...value,
          });
          form.reset(editValues);
        } else {
          await createSerieFolio({
            ...value,
          });
          form.reset(emptyValues);
        }

        setClientErrors({});
        setServerErrors({});
        onSuccess();
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Unifica estado de bloqueo por mutaciones y envío actual.
  const isPending = isCreating || isUpdating || isLoading;

  // Restablece valores por modo y limpia errores acumulados.
  const handleReset = () => {
    form.reset(isEditing ? editValues : emptyValues);
    setClientErrors({});
    setServerErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Encapsula submit del DOM y delega el flujo al formulario.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Genera key estable para controlar remount entre crear y editar.
  const formKey = isEditing ? `serie-folio-edit-${serieFolioToEdit?.id_serie_folio ?? "ready"}` : "serie-folio-new";

  return {
    form,
    formRef,
    formKey,
    isEditing,
    isPending,
    branches,
    isLoadingBranches,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
