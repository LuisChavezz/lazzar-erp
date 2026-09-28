"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import type { Employee } from "@/src/features/employees/interfaces/employee.interface";
import {
  useEmployeeCalendarOccupancy,
  useForeignOccupancySources,
} from "@/src/hooks/useEmployeeCalendarOccupancy";
import {
  AbsenceFormFields,
  AbsenceFormValues,
  createAbsenceFormSchema,
  getFechaFinError,
} from "../schemas/absence.schema";
import {
  ESTADO_PENDIENTE,
  GOCE_SUGERIDO,
  isGoceForzado,
  type TipoAusencia,
} from "../constants/absenceChoices";
import { Absence, AbsenceWrite } from "../interfaces/absence.interface";
import { useCreateAbsence } from "./useCreateAbsence";
import { useUpdateAbsence } from "./useUpdateAbsence";
import { ABSENCES_KEY, useAbsences } from "./useAbsences";
import { preflightAbsenceWrite } from "./verifyAbsenceEstado";
import { ABSENCE_OCCUPANCY_KIND } from "../utils/absenceOccupancy";

interface UseAbsenceFormParams {
  onSuccess: () => void;
  absenceToEdit?: Absence | null;
}

type AbsenceFormField = keyof AbsenceFormValues;

/** Campos que alimentan la regla cruzada de `fecha_fin` (además de sí mismo). */
export type RuleInputField = "empleado" | "fecha_inicio" | "fecha_fin";

export interface EmployeeOption {
  id: number;
  label: string;
}

/**
 * Opciones del selector de empleado: solo ACTIVOS, más el valor guardado si
 * está inactivo (con "(inactivo)") para no perder el vínculo al editar. Mismo
 * criterio que vacaciones.
 */
const buildEmployeeOptions = (
  employees: Employee[],
  currentId: number | null
): EmployeeOption[] => {
  const options = employees
    .filter((employee) => employee.activo)
    .map((employee) => ({ id: employee.id, label: getEmployeeFullName(employee) }));

  if (currentId && !options.some((option) => option.id === currentId)) {
    const current = employees.find((employee) => employee.id === currentId);
    options.unshift({
      id: currentId,
      label: current ? `${getEmployeeFullName(current)} (inactivo)` : `Empleado #${currentId}`,
    });
  }

  return options;
};

export function useAbsenceForm({ onSuccess, absenceToEdit }: UseAbsenceFormParams) {
  // Solo se edita un registro pendiente.
  const isEditing = Boolean(absenceToEdit?.id);
  const editingId = absenceToEdit?.id ?? null;

  const {
    employees,
    isLoading: isLoadingEmployees,
    isError: isErrorEmployees,
  } = useEmployees();
  // Listado en caché para el aviso TEMPRANO de traslape (en blur). La guarda
  // que decide es `preflightAbsenceWrite`, contra datos frescos del servidor.
  const { absences, hasLoaded: hasLoadedAbsences } = useAbsences();
  const queryClient = useQueryClient();
  // Fuentes de los OTROS recursos que ocupan días (vacaciones), repartidas por
  // el hub de RH: este módulo no importa el de vacaciones.
  const foreignSources = useForeignOccupancySources(ABSENCE_OCCUPANCY_KIND);

  const empleadoOptions = buildEmployeeOptions(employees, absenceToEdit?.empleado ?? null);

  const formRef = useRef<HTMLFormElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Envío en curso, síncrono (ver `onSubmit`).
  const submittingRef = useRef(false);

  const [clientErrors, setClientErrors] = useState<Partial<Record<AbsenceFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<AbsenceFormField, string>>>({});

  // ¿La regla de `fecha_fin` ya se disparó (blur o submit)? Mientras sea
  // `true`, cada cambio de sus otros campos la reevalúa. Mismo mecanismo que
  // en vacaciones.
  const firedRef = useRef(false);

  // `tipo` arranca en el default del backend y `con_goce_sueldo` en su
  // sugerencia.
  const emptyValues = useMemo<AbsenceFormValues>(
    () => ({
      empleado: 0,
      tipo: "permiso",
      fecha_inicio: "",
      fecha_fin: "",
      con_goce_sueldo: GOCE_SUGERIDO.permiso,
      motivo: "",
    }),
    []
  );

  // Valores de edición: `con_goce_sueldo` es el GUARDADO, nunca la sugerencia
  // (D1). La única excepción es la falta injustificada, cuyo `false` es forzado.
  const editValues = useMemo<AbsenceFormValues>(
    () =>
      absenceToEdit
        ? {
            empleado: absenceToEdit.empleado,
            tipo: absenceToEdit.tipo,
            fecha_inicio: absenceToEdit.fecha_inicio,
            fecha_fin: absenceToEdit.fecha_fin,
            con_goce_sueldo: isGoceForzado(absenceToEdit.tipo)
              ? false
              : absenceToEdit.con_goce_sueldo,
            motivo: absenceToEdit.motivo ?? "",
          }
        : emptyValues,
    [emptyValues, absenceToEdit]
  );

  const setServerFieldError = (field: AbsenceFormField, message: string) => {
    setServerErrors((prev) => ({ ...prev, [field]: message }));
  };

  const { mutateAsync: createAbsence, isPending: isCreating } = useCreateAbsence(setServerFieldError);
  const { mutateAsync: updateAbsence, isPending: isUpdating } = useUpdateAbsence(setServerFieldError);

  const clearFieldErrors = (field: AbsenceFormField) => {
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

  const setClientError = (field: AbsenceFormField, message: string) => {
    setClientErrors((prev) => (prev[field] === message ? prev : { ...prev, [field]: message }));
  };

  /** Mensaje de la regla de `fecha_fin` con los valores vigentes del form. */
  const getFechaFinRuleError = (overrides: Partial<AbsenceFormValues> = {}) =>
    getFechaFinError({ ...form.state.values, ...overrides }, ruleContext);

  // Valida un solo campo en blur. `fecha_fin` evalúa también su regla cruzada.
  const validateField = (field: AbsenceFormField, value: AbsenceFormValues[AbsenceFormField]) => {
    const parsed = AbsenceFormFields[field].safeParse(value);

    if (parsed.success && field === "fecha_fin") {
      const message = getFechaFinRuleError({ fecha_fin: value as string });
      if (message) {
        firedRef.current = true;
        setClientError(field, message);
        return false;
      }
    }

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

  const validateForm = (values: AbsenceFormValues) => {
    const parsed = createAbsenceFormSchema(ruleContext).safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return { success: true as const, issuePaths: [] };
    }

    const nextErrors: Partial<Record<AbsenceFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as AbsenceFormField;
      if (field === "fecha_fin") {
        firedRef.current = true;
      }
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return { success: false as const, issuePaths: Object.keys(nextErrors) };
  };

  const getError = (field: AbsenceFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  /** El envío en sí, sin la guarda de doble envío (vive en `onSubmit`). */
  const submitAbsence = async (value: AbsenceFormValues) => {
    setServerErrors({});

    if (!hasLoadedAbsences) {
      toast.error("No se pudo cargar el listado de ausencias para verificar traslapes. Intenta de nuevo.");
      return;
    }

    // Vía RÁPIDA contra la caché; la definitiva es `preflightAbsenceWrite`.
    if (isEditing && editingId !== null) {
      const current = absences.find((absence) => absence.id === editingId);
      if (!current || current.estado !== ESTADO_PENDIENTE) {
        toast.error("El registro ya no está pendiente, así que no se puede editar.");
        void queryClient.invalidateQueries({ queryKey: ABSENCES_KEY });
        onSuccess();
        return;
      }
    }

    const validationResult = validateForm(value);
    if (!validationResult.success) {
      scrollToFirstValidationError(formRef.current, validationResult.issuePaths);
      return;
    }

    // `isLoading` cubre la guarda Y la escritura: el formulario queda
    // deshabilitado mientras el traslape no esté resuelto (falla cerrado, D3).
    setIsLoading(true);
    try {
      const check = await preflightAbsenceWrite(
        queryClient,
        value,
        isEditing ? editingId : null,
        ESTADO_PENDIENTE,
        foreignSources
      );
      if (check.result === "stale") {
        onSuccess();
      }
      if (check.result === "overlap") {
        firedRef.current = true;
        setClientError("fecha_fin", check.message);
        scrollToFirstValidationError(formRef.current, ["fecha_fin"]);
      }
      if (check.result !== "ok") {
        return;
      }

      // Campo por campo: NUNCA viajan `estado`, `motivo_rechazo` ni la
      // trazabilidad. Las dos fechas viajan juntas también al editar. `motivo`
      // vacío es `""` (el campo no admite `null`). La falta injustificada
      // viaja siempre sin goce (D1).
      const payload: AbsenceWrite = {
        empleado: value.empleado,
        tipo: value.tipo,
        fecha_inicio: value.fecha_inicio,
        fecha_fin: value.fecha_fin,
        con_goce_sueldo: isGoceForzado(value.tipo) ? false : value.con_goce_sueldo,
        motivo: value.motivo.trim(),
      };

      if (isEditing && editingId !== null) {
        await updateAbsence({ id: editingId, ...payload });
      } else {
        await createAbsence(payload);
      }

      onSuccess();
    } catch {
      // El `onError` de la mutación ya avisó y pintó los errores por campo.
    } finally {
      setIsLoading(false);
    }
  };

  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      // Guarda SÍNCRONA contra el doble envío en el mismo tick. Cubre la guarda
      // de red y la escritura, y se libera en toda salida.
      if (submittingRef.current) {
        return;
      }
      submittingRef.current = true;
      try {
        await submitAbsence(value);
      } finally {
        submittingRef.current = false;
      }
    },
  });

  // Vacaciones del empleado elegido (solo `?empleado=`, nunca el listado
  // completo), para el AVISO de traslape en blur. La guarda previa a escribir
  // las vuelve a pedir frescas.
  const watchedEmpleado = useStore(form.store, (state) => state.values.empleado);
  const foreignOccupants = useEmployeeCalendarOccupancy(foreignSources, watchedEmpleado);

  const ruleContext = { absences, editingId, foreignOccupants };

  const editValuesRef = useRef(editValues);
  useEffect(() => {
    editValuesRef.current = editValues;
  }, [editValues]);

  /**
   * Repuebla el formulario cuando cambia LA ENTIDAD en edición (por `id`, no
   * por identidad del objeto). `form.reset` NO pasa por `changeTipo`, así que
   * abrir un registro nunca pisa su `con_goce_sueldo` guardado.
   */
  useEffect(() => {
    form.reset(editingId ? editValuesRef.current : emptyValues);
    firedRef.current = false;
  }, [editingId, emptyValues, form]);

  /** Reevalúa la regla de `fecha_fin` si ya se disparó, en ambos sentidos. */
  const revalidateFechaFin = (changes: Partial<AbsenceFormValues>) => {
    if (!firedRef.current) {
      return;
    }
    const message = getFechaFinRuleError(changes);
    if (message) {
      setClientError("fecha_fin", message);
    } else {
      clearFieldErrors("fecha_fin");
    }
  };

  /** Cambio de empleado o de una fecha: reevalúa orden, falta futura y traslape. */
  const changeRuleInput = <F extends RuleInputField>(field: F, nextValue: AbsenceFormValues[F]) => {
    if (form.state.values[field] === nextValue) {
      return;
    }
    if (field === "empleado") {
      form.setFieldValue("empleado", nextValue as number);
    } else {
      form.setFieldValue(field as "fecha_inicio" | "fecha_fin", nextValue as string);
    }
    clearFieldErrors(field);
    revalidateFechaFin({ [field]: nextValue });
  };

  /**
   * Cambio de `tipo` (D1). Solo si CAMBIA DE VERDAD aplica la sugerencia de
   * `con_goce_sueldo` del tipo nuevo: volver a elegir el mismo tipo no pisa una
   * elección manual. Reevalúa `fecha_fin` (la falta no admite fechas futuras).
   */
  const changeTipo = (nextTipo: TipoAusencia) => {
    if (form.state.values.tipo === nextTipo) {
      return;
    }
    form.setFieldValue("tipo", nextTipo);
    form.setFieldValue("con_goce_sueldo", GOCE_SUGERIDO[nextTipo]);
    clearFieldErrors("tipo");
    clearFieldErrors("con_goce_sueldo");
    revalidateFechaFin({ tipo: nextTipo });
  };

  const isPending = isCreating || isUpdating || isLoading;

  const handleReset = () => {
    form.reset(isEditing ? editValues : emptyValues);
    firedRef.current = false;
    setClientErrors({});
    setServerErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  const formKey = isEditing ? `absence-edit-${editingId ?? "ready"}` : "absence-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    empleadoOptions,
    isLoadingEmployees,
    isErrorEmployees,
    getError,
    changeRuleInput,
    changeTipo,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
