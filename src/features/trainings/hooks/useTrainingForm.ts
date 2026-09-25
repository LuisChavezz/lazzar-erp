"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import {
  FECHA_RANGE_MESSAGE,
  TrainingFormFields,
  TrainingFormSchema,
  TrainingFormValues,
  getCalificacionError,
  getConstanciaUrlError,
  isFechaRangeValid,
} from "../schemas/training.schema";
import { ESTADO_CON_RESULTADO } from "../constants/trainingChoices";
import { useCreateTraining } from "./useCreateTraining";
import { useUpdateTraining } from "./useUpdateTraining";
import { Training, TrainingCreate } from "../interfaces/training.interface";

interface UseTrainingFormParams {
  onSuccess: () => void;
  trainingToEdit?: Training | null;
}

type TrainingFormField = keyof TrainingFormValues;

/** Campos que solo se capturan en "Finalizado" (ver `ESTADO_CON_RESULTADO`). */
type ResultadoField = "calificacion" | "constancia_url";

const RESULTADO_RULES: Record<ResultadoField, (estado: string, value: string) => string | null> = {
  calificacion: getCalificacionError,
  constancia_url: getConstanciaUrlError,
};

export interface EmployeeOption {
  id: number;
  label: string;
}

/** Cadena recortada, o `null` si queda vacía: los opcionales son nullable. */
const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

/** Entero del input numérico, o `null` si queda vacío. */
const toNullableInt = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
};

export function useTrainingForm({ onSuccess, trainingToEdit }: UseTrainingFormParams) {
  // Determina modo creación/edición.
  const isEditing = Boolean(trainingToEdit?.id);

  // No se lee el workspace: `empresa` nunca viaja, el backend la resuelve desde
  // `empleado`. Ver `TrainingCreate`.

  // Catálogo de empleados que alimenta el select del FK obligatorio.
  const {
    employees,
    isLoading: isLoadingEmployees,
    isError: isErrorEmployees,
  } = useEmployees();

  /**
   * Opciones del select de empleado: solo empleados ACTIVOS, porque no tiene
   * sentido inscribir a una capacitación a alguien dado de baja. El catálogo
   * trae activos e inactivos, así que el filtro es de cliente.
   *
   * En edición, si el empleado actual está inactivo se agrega de todos modos:
   * sin él, el select no tendría opción para el valor guardado, mostraría
   * "Seleccionar..." y el usuario perdería el vínculo sin notarlo. Si ni
   * siquiera aparece en el catálogo, se pinta con su ID. Mismo criterio que
   * contratos.
   */
  const currentEmployeeId = trainingToEdit?.empleado ?? null;
  const employeeOptions = useMemo<EmployeeOption[]>(() => {
    const options = employees
      .filter((employee) => employee.activo)
      .map((employee) => ({ id: employee.id, label: getEmployeeFullName(employee) }));

    if (currentEmployeeId && !options.some((option) => option.id === currentEmployeeId)) {
      const current = employees.find((employee) => employee.id === currentEmployeeId);
      options.unshift({
        id: currentEmployeeId,
        label: current
          ? `${getEmployeeFullName(current)} (inactivo)`
          : `Empleado #${currentEmployeeId}`,
      });
    }

    return options;
  }, [employees, currentEmployeeId]);

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Mantiene estado local de envío para bloquear controles durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de validación cliente y servidor para cada campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<TrainingFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<TrainingFormField, string>>>({});

  // ¿La regla cruzada de fechas ya se disparó al menos una vez (por blur de
  // `fecha_fin` o por submit)? Mientras sea `true`, cada cambio de
  // `fecha_inicio` la reevalúa. Ver `revalidateFechaRange`.
  const fechaRangeFiredRef = useRef(false);

  // Lo mismo para las reglas de "Finalizado", una por campo: mientras sea
  // `true`, cada cambio de `estado` reevalúa esa regla. Ver
  // `revalidateResultadoFields`.
  const resultadoFiredRef = useRef<Record<ResultadoField, boolean>>({
    calificacion: false,
    constancia_url: false,
  });

  const resetFiredRules = () => {
    fechaRangeFiredRef.current = false;
    resultadoFiredRef.current = { calificacion: false, constancia_url: false };
  };

  // Valores vacíos. `empleado: 0` es el centinela de "Seleccionar..." y el
  // schema lo rechaza mientras siga así. `estado` arranca en el default del
  // backend y se envía SIEMPRE. Los numéricos viven como string en el form
  // (inputs `type="number"`) y se convierten al armar el payload.
  const emptyValues = useMemo<TrainingFormValues>(
    () => ({
      empleado: 0,
      nombre: "",
      institucion: "",
      fecha_inicio: "",
      fecha_fin: "",
      horas: "",
      estado: "inscrito",
      calificacion: "",
      constancia_url: "",
    }),
    []
  );

  // Deriva valores de edición.
  const editValues = useMemo<TrainingFormValues>(
    () =>
      trainingToEdit
        ? {
            empleado: trainingToEdit.empleado,
            nombre: trainingToEdit.nombre,
            institucion: trainingToEdit.institucion ?? "",
            fecha_inicio: trainingToEdit.fecha_inicio,
            fecha_fin: trainingToEdit.fecha_fin ?? "",
            horas: trainingToEdit.horas != null ? String(trainingToEdit.horas) : "",
            estado: trainingToEdit.estado,
            calificacion: trainingToEdit.calificacion ?? "",
            constancia_url: trainingToEdit.constancia_url ?? "",
          }
        : emptyValues,
    [emptyValues, trainingToEdit]
  );

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setHookError = (field: TrainingFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createTraining, isPending: isCreating } = useCreateTraining(setHookError);
  const { mutateAsync: updateTraining, isPending: isUpdating } = useUpdateTraining(setHookError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: TrainingFormField) => {
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

  // Escribe un mensaje de cliente sin re-render si ya estaba puesto.
  const setClientError = (field: TrainingFormField, message: string) => {
    setClientErrors((prev) => (prev[field] === message ? prev : { ...prev, [field]: message }));
  };

  // Valida un solo campo en blur. Se usa `TrainingFormFields` y no
  // `TrainingFormSchema.shape`: el schema lleva un refinamiento de objeto que
  // ya no expone `.shape`.
  const validateField = (field: TrainingFormField, value: TrainingFormValues[TrainingFormField]) => {
    const fieldSchema = TrainingFormFields[field];
    const parsed = fieldSchema.safeParse(value);

    // El schema de UN campo de `fecha_fin` es `z.string()` y siempre pasa, así
    // que sin esto su blur borraría el error de la regla cruzada aunque el
    // rango siguiera inválido. Por eso su blur evalúa también la regla, con la
    // fecha de inicio vigente. Mismo arreglo que en contratos.
    if (
      field === "fecha_fin" &&
      parsed.success &&
      !isFechaRangeValid(form.getFieldValue("fecha_inicio"), value as string)
    ) {
      fechaRangeFiredRef.current = true;
      setClientError("fecha_fin", FECHA_RANGE_MESSAGE);
      return false;
    }

    // Igual para los campos de "Finalizado": su schema de un campo es
    // `z.string()`, así que su regla se evalúa aquí con el `estado` vigente.
    if (field === "calificacion" || field === "constancia_url") {
      const message = RESULTADO_RULES[field](form.getFieldValue("estado"), value as string);
      if (message) {
        resultadoFiredRef.current[field] = true;
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

  // Valida todo el formulario antes de mutar y devuelve los campos inválidos
  // para poder llevar la vista al primero.
  const validateForm = (values: TrainingFormValues) => {
    const parsed = TrainingFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return { success: true as const, issuePaths: [] };
    }

    const nextErrors: Partial<Record<TrainingFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as TrainingFormField;
      if (field === "fecha_fin" && issue.message === FECHA_RANGE_MESSAGE) {
        fechaRangeFiredRef.current = true;
      }
      // El schema base de estos dos es `z.string()`: cualquier issue suyo viene
      // de su regla de "Finalizado".
      if (field === "calificacion" || field === "constancia_url") {
        resultadoFiredRef.current[field] = true;
      }
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return { success: false as const, issuePaths: Object.keys(nextErrors) };
  };

  // Entrega error compatible con componentes visuales actuales.
  const getError = (field: TrainingFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      const validationResult = validateForm(value);
      if (!validationResult.success) {
        scrollToFirstValidationError(formRef.current, validationResult.issuePaths);
        return;
      }

      setIsLoading(true);
      try {
        // Campo por campo, a propósito: uno olvidado aquí no falla, solo deja
        // de viajar. `estado` viaja SIEMPRE. `institucion` NO es nullable
        // (vacío = ""). Los demás opcionales viajan como null cuando quedan
        // vacíos. `calificacion` y `constancia_url` viajan como null fuera de
        // "Finalizado" aunque el form conserve lo capturado (así un cambio de
        // estado accidental no lo borra antes de guardar).
        const hasResultado = value.estado === ESTADO_CON_RESULTADO;
        const payload: TrainingCreate = {
          empleado: value.empleado,
          nombre: value.nombre.trim(),
          institucion: value.institucion.trim(),
          fecha_inicio: value.fecha_inicio,
          fecha_fin: toNullable(value.fecha_fin),
          horas: toNullableInt(value.horas),
          estado: value.estado,
          calificacion: hasResultado ? toNullable(value.calificacion) : null,
          constancia_url: hasResultado ? toNullable(value.constancia_url) : null,
        };

        if (isEditing && trainingToEdit) {
          await updateTraining({ id: trainingToEdit.id, ...payload });
        } else {
          await createTraining(payload);
        }

        onSuccess();
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Mantiene a mano los últimos valores de edición SIN que su identidad sea
  // una dependencia del efecto de abajo. Va declarado antes para que React lo
  // ejecute primero cuando ambos efectos caen en el mismo commit.
  const editValuesRef = useRef(editValues);
  useEffect(() => {
    editValuesRef.current = editValues;
  }, [editValues]);

  /**
   * Repuebla el formulario cuando cambia LA ENTIDAD en edición, identificada
   * por su `id` y no por la identidad del objeto: un refetch en segundo plano
   * que entregara un objeto nuevo no debe borrar lo que el usuario llevaba
   * escrito.
   */
  const editedTrainingId = trainingToEdit?.id ?? null;
  useEffect(() => {
    form.reset(editedTrainingId ? editValuesRef.current : emptyValues);
    fechaRangeFiredRef.current = false;
    resultadoFiredRef.current = { calificacion: false, constancia_url: false };
  }, [editedTrainingId, emptyValues, form]);

  /**
   * Reevalúa la regla cruzada de fechas cuando cambia `fecha_inicio`.
   *
   * El refinamiento deja su error bajo `fecha_fin`, pero `clearFieldErrors`
   * solo limpia el campo que se editó: si el usuario corregía el rango moviendo
   * `fecha_inicio`, el mensaje seguiría bajo `fecha_fin` aunque ya no aplicara.
   *
   * Reevalúa en AMBOS sentidos (limpia o repone): `<input type="date">` emite
   * valores intermedios al teclear que cumplen la regla un instante, y si solo
   * limpiara, uno de esos borraría el error aunque la fecha final siga siendo
   * inválida.
   *
   * Solo actúa si la regla YA SE DISPARÓ (`fechaRangeFiredRef`), sea por el
   * blur de `fecha_fin` o por un submit. La guarda NO es `submissionAttempts`
   * —el error también nace del blur— ni "el error está visible ahora": un
   * intermedio lo borra un instante y una guarda por visibilidad dejaría de
   * reevaluar justo cuando llega el valor definitivo. Mismo arreglo que en
   * contratos.
   */
  const revalidateFechaRange = (fechaInicio: string, fechaFin: string) => {
    if (!fechaRangeFiredRef.current || !fechaInicio || !fechaFin) {
      return;
    }

    if (isFechaRangeValid(fechaInicio, fechaFin)) {
      clearFieldErrors("fecha_fin");
    } else {
      setClientError("fecha_fin", FECHA_RANGE_MESSAGE);
    }
  };

  /**
   * Reevalúa las reglas de `calificacion` y `constancia_url` cuando cambia
   * `estado`, el "otro campo" de esas reglas.
   *
   * - Fuera de "Finalizado" la regla no aplica y los inputs quedan
   *   deshabilitados: su error se limpia SIEMPRE (el usuario ya no podría
   *   corregirlo desde ahí). Los valores se conservan en el form.
   * - De vuelta en "Finalizado", solo se reevalúa (en ambos sentidos) la regla
   *   que YA SE DISPARÓ antes, con la misma guarda por ref que las fechas: no
   *   se reprocha un valor que el usuario aún no ha tocado.
   */
  const revalidateResultadoFields = (estado: string) => {
    (Object.keys(RESULTADO_RULES) as ResultadoField[]).forEach((field) => {
      if (estado !== ESTADO_CON_RESULTADO) {
        clearFieldErrors(field);
        return;
      }
      if (!resultadoFiredRef.current[field]) {
        return;
      }
      const message = RESULTADO_RULES[field](estado, form.getFieldValue(field));
      if (message) {
        setClientError(field, message);
      } else {
        clearFieldErrors(field);
      }
    });
  };

  // Expone estado combinado de carga/mutación.
  const isPending = isCreating || isUpdating || isLoading;

  // Limpia estado y hace scroll superior suave.
  const handleReset = () => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
    resetFiredRules();
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
  const formKey = isEditing ? `training-edit-${trainingToEdit?.id ?? "ready"}` : "training-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    employeeOptions,
    isLoadingEmployees,
    isErrorEmployees,
    getError,
    clearFieldErrors,
    revalidateFechaRange,
    revalidateResultadoFields,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
