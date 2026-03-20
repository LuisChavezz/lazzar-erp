"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import { LocationFormSchema, LocationFormValues } from "../schemas/location.schema";
import { useCreateLocation } from "./useCreateLocation";
import { useUpdateLocation } from "./useUpdateLocation";
import { useWarehouses } from "../../warehouses/hooks/useWarehouses";
import { Location } from "../interfaces/location.interface";

interface UseLocationFormParams {
  onSuccess: () => void;
  locationToEdit?: Location | null;
}

type LocationFormField = keyof LocationFormValues;

export function useLocationForm({ onSuccess, locationToEdit }: UseLocationFormParams) {
  // Carga almacenes para construir catálogo y prerequisitos.
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehouses();

  // Mantiene el mismo filtro de almacenes activos usado por el formulario original.
  const activeWarehouses = useMemo(
    () => warehouses.filter((warehouse) => warehouse.estatus === "ACTIVO"),
    [warehouses]
  );

  // Mantiene la misma regla de bloqueo por falta de almacenes activos.
  const missingItems = useMemo(
    () =>
      [activeWarehouses.length === 0 ? "Almacenes activos" : null].filter(
        (item): item is string => Boolean(item)
      ),
    [activeWarehouses.length]
  );

  // Detecta modo edición con base en la entidad recibida.
  const isEditing = Boolean(locationToEdit?.id_ubicacion);

  // Conserva referencia del formulario para scroll al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Separa errores locales y de servidor para mantener mensajes por campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<LocationFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<LocationFormField, string>>>({});

  // Replica estado local de carga del formulario original.
  const [isLoading, setIsLoading] = useState(false);

  // Define valores base de creación.
  const emptyValues = useMemo<LocationFormValues>(
    () => ({
      almacen: 0,
      pasillo: "",
      rack: "",
      estatus: "ACTIVO",
    }),
    []
  );

  // Normaliza valores de edición para evitar almacenes no activos.
  const editValues = useMemo<LocationFormValues>(() => {
    if (!locationToEdit) {
      return emptyValues;
    }

    const hasWarehouse = activeWarehouses.some(
      (warehouse) => warehouse.id_almacen === locationToEdit.almacen
    );

    return {
      almacen: hasWarehouse ? locationToEdit.almacen : 0,
      pasillo: locationToEdit.pasillo,
      rack: locationToEdit.rack,
      estatus: locationToEdit.estatus as LocationFormValues["estatus"],
    };
  }, [activeWarehouses, emptyValues, locationToEdit]);

  // Traduce errores de mutaciones al estado de errores por campo.
  const setHookError = (field: LocationFormField, error: { message?: string }) => {
    if (!error?.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createLocation, isPending: isCreating } = useCreateLocation(setHookError);
  const { mutateAsync: updateLocation, isPending: isUpdating } = useUpdateLocation(setHookError);

  // Limpia errores de un campo cuando cambia su valor.
  const clearFieldErrors = (field: LocationFormField) => {
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

  // Valida un campo puntual en blur con su regla del schema.
  const validateField = (field: LocationFormField, value: LocationFormValues[LocationFormField]) => {
    const fieldSchema = LocationFormSchema.shape[field];
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

  // Ejecuta validación completa antes de enviar mutaciones.
  const validateForm = (values: LocationFormValues) => {
    const parsed = LocationFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<LocationFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as LocationFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  // Prioriza error servidor y conserva contrato visual de componentes.
  const getError = (field: LocationFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // Centraliza submit para crear/editar conservando flujo original.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      setIsLoading(true);
      try {
        if (isEditing && locationToEdit) {
          await updateLocation({ id_ubicacion: locationToEdit.id_ubicacion, ...value });
          form.reset(editValues);
        } else {
          await createLocation(value);
          form.reset(emptyValues);
        }
        onSuccess();
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Sincroniza valores cuando se actualiza modo edición o catálogos.
  useEffect(() => {
    if (!isEditing) {
      return;
    }
    form.reset(editValues);
  }, [editValues, form, isEditing]);

  // Expone estado de bloqueo igual al comportamiento previo.
  const isPending = isCreating || isUpdating || isLoading;

  // Limpia formulario, errores y realiza scroll suave al inicio.
  const handleReset = () => {
    form.reset(isEditing ? editValues : emptyValues);
    setClientErrors({});
    setServerErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Encapsula submit DOM para delegar en TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Define key estable para remount entre creación y edición.
  const formKey = isEditing ? `location-edit-${locationToEdit?.id_ubicacion ?? "ready"}` : "location-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    isLoadingWarehouses,
    activeWarehouses,
    missingItems,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
