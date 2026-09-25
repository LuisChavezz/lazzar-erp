"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import type { Employee } from "@/src/features/employees/interfaces/employee.interface";
import {
  EvaluationFormFields,
  EvaluationFormSchema,
  EvaluationFormValues,
  getEvaluadorError,
  getPuntajeError,
} from "../schemas/evaluation.schema";
import {
  ESTADO_COMPLETADA,
  ESTADO_EVALUACION_OPTIONS,
} from "../constants/evaluationChoices";
import { useCreateEvaluation } from "./useCreateEvaluation";
import { useUpdateEvaluation } from "./useUpdateEvaluation";
import { Evaluation, EvaluationCreate } from "../interfaces/evaluation.interface";

interface UseEvaluationFormParams {
  onSuccess: () => void;
  evaluationToEdit?: Evaluation | null;
}

type EvaluationFormField = keyof EvaluationFormValues;

/** Campos cuyas reglas dependen de otros campos (ver el schema). */
type CrossRuleField = "evaluador" | "puntaje";

export interface EmployeeOption {
  id: number;
  label: string;
}

/**
 * Opciones de un selector de empleado: solo ACTIVOS, más el valor guardado si
 * está inactivo (con el sufijo "(inactivo)") para no perder el vínculo al
 * editar; si ni siquiera aparece en el catálogo, se pinta con su ID. Mismo
 * criterio que capacitaciones e incidencias, aplicado a los DOS FK
 * (`empleado` y `evaluador`) contra el mismo catálogo.
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

export function useEvaluationForm({ onSuccess, evaluationToEdit }: UseEvaluationFormParams) {
  // Determina modo creación/edición.
  const isEditing = Boolean(evaluationToEdit?.id);

  /**
   * Una evaluación que YA estaba completada no vuelve a "Pendiente" en la UI
   * (D3): su selector de estado solo ofrece "Completada". El resto de sus
   * campos sigue editable.
   */
  const isLockedCompleted = isEditing && evaluationToEdit?.estado === ESTADO_COMPLETADA;
  const estadoOptions = isLockedCompleted
    ? ESTADO_EVALUACION_OPTIONS.filter((option) => option.value === ESTADO_COMPLETADA)
    : ESTADO_EVALUACION_OPTIONS;

  // Un solo catálogo alimenta los dos selectores.
  const {
    employees,
    isLoading: isLoadingEmployees,
    isError: isErrorEmployees,
  } = useEmployees();

  const currentEmpleadoId = evaluationToEdit?.empleado ?? null;
  const currentEvaluadorId = evaluationToEdit?.evaluador ?? null;
  // Sin `useMemo`: el React Compiler memoiza, y nada depende de su identidad.
  const empleadoOptions = buildEmployeeOptions(employees, currentEmpleadoId);
  const evaluadorOptions = buildEmployeeOptions(employees, currentEvaluadorId);

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Mantiene estado local de envío para bloquear controles durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de validación cliente y servidor para cada campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<EvaluationFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<EvaluationFormField, string>>>({});

  // ¿La regla cruzada de cada campo ya se disparó al menos una vez (por su blur
  // o por submit)? Mientras sea `true`, cada cambio de los otros campos de la
  // regla la reevalúa. Ver `revalidateCrossRules`.
  const firedRef = useRef<Record<CrossRuleField, boolean>>({ evaluador: false, puntaje: false });

  // Valores vacíos. `empleado: 0` es "Seleccionar..." (el schema lo rechaza) y
  // `evaluador: 0` es "Sin evaluador". `tipo`, `periodo` y `estado` arrancan en
  // el default del backend y se envían SIEMPRE.
  const emptyValues = useMemo<EvaluationFormValues>(
    () => ({
      empleado: 0,
      evaluador: 0,
      tipo: "desempeno",
      periodo: "anual",
      estado: "pendiente",
      fecha: "",
      puntaje: "",
      comentarios: "",
    }),
    []
  );

  // Deriva valores de edición.
  const editValues = useMemo<EvaluationFormValues>(
    () =>
      evaluationToEdit
        ? {
            empleado: evaluationToEdit.empleado,
            evaluador: evaluationToEdit.evaluador ?? 0,
            tipo: evaluationToEdit.tipo,
            periodo: evaluationToEdit.periodo,
            estado: evaluationToEdit.estado,
            fecha: evaluationToEdit.fecha,
            // Tal cual llega (`"92.50"`), igual que la celda de la tabla y
            // que `calificacion` en capacitaciones.
            puntaje: evaluationToEdit.puntaje ?? "",
            comentarios: evaluationToEdit.comentarios ?? "",
          }
        : emptyValues,
    [emptyValues, evaluationToEdit]
  );

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setHookError = (field: EvaluationFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createEvaluation, isPending: isCreating } = useCreateEvaluation(setHookError);
  const { mutateAsync: updateEvaluation, isPending: isUpdating } = useUpdateEvaluation(setHookError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: EvaluationFormField) => {
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
  const setClientError = (field: EvaluationFormField, message: string) => {
    setClientErrors((prev) => (prev[field] === message ? prev : { ...prev, [field]: message }));
  };

  /** Mensaje de la regla cruzada de `field` con los valores vigentes del form. */
  const getCrossRuleError = (field: CrossRuleField, overrides: Partial<EvaluationFormValues> = {}) => {
    const values = { ...form.state.values, ...overrides };
    return field === "evaluador"
      ? getEvaluadorError(values.evaluador, values.empleado, values.estado)
      : getPuntajeError(values.puntaje, values.estado);
  };

  // Valida un solo campo en blur. Se usa `EvaluationFormFields` y no
  // `EvaluationFormSchema.shape`: el schema lleva un refinamiento de objeto que
  // ya no expone `.shape`.
  const validateField = (
    field: EvaluationFormField,
    value: EvaluationFormValues[EvaluationFormField]
  ) => {
    const fieldSchema = EvaluationFormFields[field];
    const parsed = fieldSchema.safeParse(value);

    // El schema de UN campo de `evaluador` y `puntaje` no conoce a los demás
    // campos y casi siempre pasa, así que sin esto su blur borraría el error de
    // su regla cruzada aunque siguiera aplicando. Por eso su blur evalúa
    // también la regla. Mismo arreglo que en incidencias y capacitaciones.
    if (parsed.success && (field === "evaluador" || field === "puntaje")) {
      const message = getCrossRuleError(field, { [field]: value });
      if (message) {
        firedRef.current[field] = true;
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
  const validateForm = (values: EvaluationFormValues) => {
    const parsed = EvaluationFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return { success: true as const, issuePaths: [] };
    }

    const nextErrors: Partial<Record<EvaluationFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as EvaluationFormField;
      if (field === "evaluador" || field === "puntaje") {
        firedRef.current[field] = true;
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
  const getError = (field: EvaluationFormField) => {
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
        // de viajar. `tipo`, `periodo` y `estado` viajan SIEMPRE. `evaluador`
        // viaja como null si no se eligió (0). `puntaje` solo viaja en
        // "Completada"; en otro estado va null aunque el form conserve lo
        // capturado. `comentarios` NO es nullable (vacío = "").
        const isCompleted = value.estado === ESTADO_COMPLETADA;
        const puntaje = value.puntaje.trim();
        const payload: EvaluationCreate = {
          empleado: value.empleado,
          evaluador: value.evaluador > 0 ? value.evaluador : null,
          tipo: value.tipo,
          periodo: value.periodo,
          estado: value.estado,
          fecha: value.fecha,
          puntaje: isCompleted && puntaje ? puntaje : null,
          comentarios: value.comentarios.trim(),
        };

        if (isEditing && evaluationToEdit) {
          await updateEvaluation({ id: evaluationToEdit.id, ...payload });
        } else {
          await createEvaluation(payload);
        }

        onSuccess();
      } catch {
        // El `onError` de la mutación ya avisó (toast en español en todos los
        // casos: red, 5xx y 400) y pintó los errores por campo. Sin este catch
        // el rechazo de `mutateAsync` escaparía como promesa no manejada.
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
  const editedEvaluationId = evaluationToEdit?.id ?? null;
  useEffect(() => {
    form.reset(editedEvaluationId ? editValuesRef.current : emptyValues);
    firedRef.current = { evaluador: false, puntaje: false };
  }, [editedEvaluationId, emptyValues, form]);

  /**
   * Reevalúa las reglas cruzadas cuando cambia uno de sus "otros" campos:
   * `empleado` (autoevaluación) y `estado` (obligatoriedad de evaluador y
   * puntaje). Recibe el valor NUEVO del campo que cambió, porque el estado del
   * form todavía puede no reflejarlo.
   *
   * Reevalúa en AMBOS sentidos (limpia o repone), y solo las reglas que YA SE
   * DISPARARON (`firedRef`), por blur o por submit: antes de eso no se reprocha
   * nada. La guarda NO es `submissionAttempts` —el error también nace del
   * blur— ni "el error está visible ahora". Mismo arreglo que en incidencias.
   */
  const revalidateCrossRules = (changes: Partial<EvaluationFormValues>) => {
    (["evaluador", "puntaje"] as CrossRuleField[]).forEach((field) => {
      if (!firedRef.current[field]) {
        return;
      }
      const message = getCrossRuleError(field, changes);
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
    firedRef.current = { evaluador: false, puntaje: false };
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
  const formKey = isEditing ? `evaluation-edit-${evaluationToEdit?.id ?? "ready"}` : "evaluation-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    estadoOptions,
    empleadoOptions,
    evaluadorOptions,
    isLoadingEmployees,
    isErrorEmployees,
    getError,
    clearFieldErrors,
    revalidateCrossRules,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
