"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { ShiftFormFields, ShiftFormSchema, ShiftFormValues } from "../schemas/shift.schema";
import { serializeDiasLaborales } from "../constants/diasLaborales";
import { trimTimeToHHMM } from "../utils/shiftTime";
import { useCreateShift } from "./useCreateShift";
import { useUpdateShift } from "./useUpdateShift";
import { Shift } from "../interfaces/shift.interface";

interface UseShiftFormParams {
  onSuccess: () => void;
  shiftToEdit?: Shift | null;
}

type ShiftFormField = keyof ShiftFormValues;

export function useShiftForm({ onSuccess, shiftToEdit }: UseShiftFormParams) {
  // Determina modo creación/edición para mantener el flujo existente.
  const isEditing = Boolean(shiftToEdit?.id);

  // Empresa del workspace activo: se exige para dar de alta un turno.
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Mantiene estado local de envío para bloquear controles durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de validación cliente y servidor para cada campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<ShiftFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<ShiftFormField, string>>>({});

  // Define valores vacíos del formulario. Los defaults del backend (5 minutos
  // de tolerancia y 8 horas base) se siembran aquí para que el alta refleje lo
  // que el registro tendrá realmente.
  const emptyValues = useMemo<ShiftFormValues>(
    () => ({
      nombre: "",
      hora_entrada: "",
      hora_salida: "",
      dias_laborales: "",
      tolerancia_retardo_minutos: 5,
      horas_base_diarias: "8.00",
      descripcion: "",
    }),
    []
  );

  // Deriva valores de edición. Las horas llegan como "HH:MM:SS" y el input de
  // tipo `time` solo entiende "HH:MM".
  const editValues = useMemo<ShiftFormValues>(
    () =>
      shiftToEdit
        ? {
            nombre: shiftToEdit.nombre,
            hora_entrada: trimTimeToHHMM(shiftToEdit.hora_entrada),
            hora_salida: trimTimeToHHMM(shiftToEdit.hora_salida),
            dias_laborales: shiftToEdit.dias_laborales ?? "",
            tolerancia_retardo_minutos: shiftToEdit.tolerancia_retardo_minutos,
            horas_base_diarias: shiftToEdit.horas_base_diarias ?? "",
            descripcion: shiftToEdit.descripcion ?? "",
          }
        : emptyValues,
    [emptyValues, shiftToEdit]
  );

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setHookError = (field: ShiftFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createShift, isPending: isCreating } = useCreateShift(setHookError);
  const { mutateAsync: updateShift, isPending: isUpdating } = useUpdateShift(setHookError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: ShiftFormField) => {
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

  // Valida un solo campo en blur. Se usa `ShiftFormFields` y no
  // `ShiftFormSchema.shape`: el schema lleva un `refine` de objeto y un
  // `ZodEffects` ya no expone `.shape`. La regla cruzada de horas, por tanto,
  // solo se evalúa en el submit.
  const validateField = (field: ShiftFormField, value: ShiftFormValues[ShiftFormField]) => {
    const fieldSchema = ShiftFormFields[field];
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

  // Valida todo el formulario antes de mutar.
  const validateForm = (values: ShiftFormValues) => {
    const parsed = ShiftFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ShiftFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ShiftFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  // Entrega error compatible con componentes visuales actuales.
  const getError = (field: ShiftFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  /**
   * Marca o desmarca un día y reescribe `dias_laborales` en orden canónico.
   *
   * El campo del formulario es la CADENA, no el arreglo: así un valor heredado
   * que el selector no sabe leer sobrevive intacto mientras nadie toque una
   * casilla.
   */
  const toggleDiaLaboral = (selected: string[], dia: string, checked: boolean) => {
    const next = checked ? [...selected, dia] : selected.filter((entry) => entry !== dia);
    return serializeDiasLaborales(next);
  };

  // Controla submit con la misma lógica original.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      // `empresa` es obligatorio en el backend y no se captura en el form: sin
      // empresa activa el POST fallaría con un error que ningún campo muestra.
      if (!isEditing && !companyId) {
        toast.error("Selecciona una empresa antes de registrar un turno");
        return;
      }

      setIsLoading(true);
      try {
        // Las horas viajan como "HH:MM": la API las acepta sin segundos.
        // Los opcionales nullable viajan como null cuando quedan vacíos, igual
        // que en puestos. `dias_laborales` es la excepción: es la cadena que
        // emite el selector y su vacío legítimo es "".
        const horasBase = value.horas_base_diarias.trim();
        const descripcion = value.descripcion.trim();
        const payload = {
          nombre: value.nombre.trim().toUpperCase(),
          hora_entrada: value.hora_entrada,
          hora_salida: value.hora_salida,
          dias_laborales: value.dias_laborales.trim(),
          tolerancia_retardo_minutos: value.tolerancia_retardo_minutos,
          horas_base_diarias: horasBase ? horasBase : null,
          descripcion: descripcion ? descripcion : null,
        };

        if (isEditing && shiftToEdit) {
          await updateShift({
            id: shiftToEdit.id,
            empresa: shiftToEdit.empresa,
            ...payload,
          });
        } else {
          await createShift(payload);
        }

        onSuccess();
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Sincroniza valores cuando cambia la entidad en edición.
  useEffect(() => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
  }, [editValues, emptyValues, form, isEditing]);

  // Expone estado combinado de carga/mutación.
  const isPending = isCreating || isUpdating || isLoading;

  // Limpia estado y hace scroll superior suave.
  const handleReset = () => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
    setClientErrors({});
    setServerErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Encapsula submit del form y delega en TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Mantiene key estable para remount entre crear y editar.
  const formKey = isEditing ? `shift-edit-${shiftToEdit?.id ?? "ready"}` : "shift-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    toggleDiaLaboral,
    handleReset,
    handleFormSubmit,
  };
}
