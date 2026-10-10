"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import type { Employee } from "@/src/features/employees/interfaces/employee.interface";
import { useShifts } from "@/src/features/shifts/hooks/useShifts";
import {
  useEmployeeCalendarOccupancy,
  useForeignOccupancySources,
} from "@/src/hooks/useEmployeeCalendarOccupancy";
import {
  createVacationFormSchema,
  getDiasSolicitadosError,
  getFechaFinError,
  VacationFormFields,
  VacationFormValues,
} from "../schemas/vacation.schema";
import { ESTADO_PENDIENTE } from "../constants/vacationChoices";
import { Vacation, VacationWrite } from "../interfaces/vacation.interface";
import { suggestDiasSolicitados, toPrefillValue } from "../utils/suggestDiasSolicitados";
import { VACATION_OCCUPANCY_KIND } from "../utils/vacationOccupancy";
import { useCreateVacation } from "./useCreateVacation";
import { useUpdateVacation } from "./useUpdateVacation";
import { useVacations, VACATIONS_KEY } from "./useVacations";
import { preflightVacationWrite } from "./verifyVacationEstado";

interface UseVacationFormParams {
  onSuccess: () => void;
  vacationToEdit?: Vacation | null;
}

type VacationFormField = keyof VacationFormValues;

/** Campos cuyas reglas dependen de otros campos (ver el schema). */
type CrossRuleField = "fecha_fin" | "dias_solicitados";

/** Campos que, al cambiar DE VERDAD, recalculan la sugerencia de días (D1). */
export type DiasInputField = "empleado" | "fecha_inicio" | "fecha_fin";

export interface EmployeeOption {
  id: number;
  label: string;
}

/**
 * Opciones del selector de empleado: solo ACTIVOS, más el valor guardado si
 * está inactivo (con el sufijo "(inactivo)") para no perder el vínculo al
 * editar; si ni siquiera aparece en el catálogo, se pinta con su ID. Mismo
 * criterio que evaluaciones, capacitaciones e incidencias.
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

const NO_FIRED: Record<CrossRuleField, boolean> = { fecha_fin: false, dias_solicitados: false };

/**
 * De dónde salió el valor vigente de `dias_solicitados`:
 * - `auto`: la sugerencia (o vacío porque aún no la hay). Se actualiza sola
 *   cuando llega o cambia un catálogo que la alimenta (turnos, empleados).
 * - `manual`: lo tecleó la persona. Nunca se pisa por la llegada de datos.
 * - `stored`: el valor guardado de una solicitud en edición (D1: abrirla nunca
 *   lo recalcula).
 * Cambiar DE VERDAD el empleado o una fecha vuelve a `auto` (D1).
 */
type DiasSource = "auto" | "manual" | "stored";

export function useVacationForm({ onSuccess, vacationToEdit }: UseVacationFormParams) {
  // Determina modo creación/edición. Solo se edita una solicitud pendiente.
  const isEditing = Boolean(vacationToEdit?.id);
  const editingId = vacationToEdit?.id ?? null;

  const {
    employees,
    isLoading: isLoadingEmployees,
    isInitialError: isErrorEmployees,
  } = useEmployees();
  // El turno del empleado da los días laborales de la sugerencia.
  const { shifts, isLoading: isLoadingShifts, isError: isErrorShifts } = useShifts();
  // El listado COMPLETO alimenta la regla de traslape (misma caché que la tabla).
  const { vacations, hasLoaded: hasLoadedVacations } = useVacations();
  const queryClient = useQueryClient();
  // Fuentes de los OTROS recursos que ocupan días (permisos y ausencias),
  // repartidas por el hub de RH: este módulo no importa el de ausencias.
  const foreignSources = useForeignOccupancySources(VACATION_OCCUPANCY_KIND);

  const currentEmpleadoId = vacationToEdit?.empleado ?? null;
  // Sin `useMemo`: el React Compiler memoiza, y nada depende de su identidad.
  const empleadoOptions = buildEmployeeOptions(employees, currentEmpleadoId);

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Mantiene estado local de envío para bloquear controles durante submit.
  const [isLoading, setIsLoading] = useState(false);
  // Envío en curso, síncrono (ver `onSubmit`).
  const submittingRef = useRef(false);

  // Separa errores de validación cliente y servidor para cada campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<VacationFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<VacationFormField, string>>>({});

  // ¿La regla cruzada de cada campo ya se disparó al menos una vez (por su blur
  // o por submit)? Mientras sea `true`, cada cambio de los otros campos de la
  // regla la reevalúa. Mismo mecanismo que en evaluaciones.
  const firedRef = useRef<Record<CrossRuleField, boolean>>({ ...NO_FIRED });

  // Origen del valor de `dias_solicitados` (ver `DiasSource`).
  const diasSourceRef = useRef<DiasSource>(isEditing ? "stored" : "auto");

  const emptyValues = useMemo<VacationFormValues>(
    () => ({
      empleado: 0,
      fecha_inicio: "",
      fecha_fin: "",
      dias_solicitados: "",
      motivo: "",
    }),
    []
  );

  // Deriva valores de edición. `dias_solicitados` es el valor GUARDADO: abrir
  // una solicitud para editarla nunca lo recalcula (D1).
  const editValues = useMemo<VacationFormValues>(
    () =>
      vacationToEdit
        ? {
            empleado: vacationToEdit.empleado,
            fecha_inicio: vacationToEdit.fecha_inicio,
            fecha_fin: vacationToEdit.fecha_fin,
            dias_solicitados: String(vacationToEdit.dias_solicitados),
            motivo: vacationToEdit.motivo ?? "",
          }
        : emptyValues,
    [emptyValues, vacationToEdit]
  );

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setServerFieldError = (field: VacationFormField, message: string) => {
    setServerErrors((prev) => ({ ...prev, [field]: message }));
  };

  const { mutateAsync: createVacation, isPending: isCreating } = useCreateVacation(setServerFieldError);
  const { mutateAsync: updateVacation, isPending: isUpdating } = useUpdateVacation(setServerFieldError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: VacationFormField) => {
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
  const setClientError = (field: VacationFormField, message: string) => {
    setClientErrors((prev) => (prev[field] === message ? prev : { ...prev, [field]: message }));
  };

  /** Mensaje de la regla cruzada de `field` con los valores vigentes del form. */
  const getCrossRuleError = (field: CrossRuleField, overrides: Partial<VacationFormValues> = {}) => {
    const values = { ...form.state.values, ...overrides };
    return field === "fecha_fin"
      ? getFechaFinError(values, ruleContext)
      : getDiasSolicitadosError(values);
  };

  // Valida un solo campo en blur. Se usa `VacationFormFields` y no el schema
  // completo: el refinamiento de objeto ya no expone `.shape`.
  const validateField = (field: VacationFormField, value: VacationFormValues[VacationFormField]) => {
    const parsed = VacationFormFields[field].safeParse(value);

    // El schema de UN campo de `fecha_fin` y `dias_solicitados` no conoce a los
    // demás y casi siempre pasa, así que su blur evalúa también la regla
    // cruzada; sin esto borraría un error que sigue aplicando.
    if (parsed.success && (field === "fecha_fin" || field === "dias_solicitados")) {
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
  const validateForm = (values: VacationFormValues) => {
    const parsed = createVacationFormSchema(ruleContext).safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return { success: true as const, issuePaths: [] };
    }

    const nextErrors: Partial<Record<VacationFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as VacationFormField;
      if (field === "fecha_fin" || field === "dias_solicitados") {
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
  const getError = (field: VacationFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  /**
   * El envío en sí, sin la guarda de doble envío (vive en `onSubmit`).
   */
  const submitVacation = async (value: VacationFormValues) => {
    setServerErrors({});

    // Sin el listado no se puede comprobar el traslape (D6): no se envía a
    // ciegas.
    if (!hasLoadedVacations) {
      toast.error("No se pudo cargar el listado de vacaciones para verificar traslapes. Intenta de nuevo.");
      return;
    }

    // La solicitud pudo aprobarse o rechazarse (otra pestaña, otra persona)
    // mientras el diálogo estaba abierto. El backend aceptaría el PATCH igual,
    // así que la guarda vive aquí. Esta es la vía RÁPIDA, contra la caché;
    // la definitiva es `preflightVacationWrite`, justo antes del PATCH.
    if (isEditing && editingId !== null) {
      const current = vacations.find((vacation) => vacation.id === editingId);
      if (!current || current.estado !== ESTADO_PENDIENTE) {
        toast.error("La solicitud ya no está pendiente, así que no se puede editar.");
        void queryClient.invalidateQueries({ queryKey: VACATIONS_KEY });
        onSuccess();
        return;
      }
    }

    const validationResult = validateForm(value);
    if (!validationResult.success) {
      scrollToFirstValidationError(formRef.current, validationResult.issuePaths);
      return;
    }

    // `isLoading` cubre la verificación Y la escritura: el formulario queda
    // deshabilitado desde antes del GET, así no hay doble envío.
    setIsLoading(true);
    try {
      // La caché puede estar vieja sin que nada lo delate: antes del POST o
      // del PATCH se leen del servidor las solicitudes del empleado (traslape)
      // y, al editar, el estado de la editada (ver `preflightVacationWrite`).
      // `stale` → ya se avisó e invalidó, se cierra; `overlap` → el mensaje
      // de la regla va bajo `fecha_fin` y el diálogo queda abierto; `error`
      // → falla cerrado, el diálogo queda abierto con lo capturado.
      const check = await preflightVacationWrite(
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
        firedRef.current.fecha_fin = true;
        setClientError("fecha_fin", check.message);
        scrollToFirstValidationError(formRef.current, ["fecha_fin"]);
      }
      if (check.result !== "ok") {
        return;
      }

      // Campo por campo, a propósito: uno olvidado aquí no falla, solo deja de
      // viajar. NUNCA viajan `estado` (el PATCH lo aceptaría), `motivo_rechazo`
      // ni la trazabilidad. Las dos fechas viajan juntas también al editar:
      // el backend solo compara las que recibe. `dias_disponibles_al_momento`
      // va siempre null (saldo fuera de alcance, D7).
      const motivo = value.motivo.trim();
      const payload: VacationWrite = {
        empleado: value.empleado,
        fecha_inicio: value.fecha_inicio,
        fecha_fin: value.fecha_fin,
        dias_solicitados: Number(value.dias_solicitados.trim()),
        motivo: motivo ? motivo : null,
        dias_disponibles_al_momento: null,
      };

      if (isEditing && editingId !== null) {
        await updateVacation({ id: editingId, ...payload });
      } else {
        await createVacation(payload);
      }

      onSuccess();
    } catch {
      // El `onError` de la mutación ya avisó (toast en español en todos los
      // casos) y pintó los errores por campo. Sin este catch el rechazo de
      // `mutateAsync` escaparía como promesa no manejada.
    } finally {
      setIsLoading(false);
    }
  };

  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      // Guarda SÍNCRONA contra el doble envío en el mismo tick (doble Enter o
      // doble clic): `isLoading` deshabilita el formulario hasta el siguiente
      // render. Cubre la guarda de red Y la escritura, y se libera en toda
      // salida. Mismo criterio que `checkingDeleteRef` en `VacationList`.
      if (submittingRef.current) {
        return;
      }
      submittingRef.current = true;
      try {
        await submitVacation(value);
      } finally {
        submittingRef.current = false;
      }
    },
  });

  // Valores que alimentan el traslape y la sugerencia de días, observados para
  // que la llegada de datos (catálogos, ocupación del empleado) se refleje.
  const watchedEmpleado = useStore(form.store, (state) => state.values.empleado);
  const watchedFechaInicio = useStore(form.store, (state) => state.values.fecha_inicio);
  const watchedFechaFin = useStore(form.store, (state) => state.values.fecha_fin);

  // Permisos y ausencias del empleado elegido (solo `?empleado=`), para el
  // AVISO de traslape en blur. La guarda previa a escribir los vuelve a pedir.
  const foreignOccupants = useEmployeeCalendarOccupancy(foreignSources, watchedEmpleado);

  // Contexto de las reglas cruzadas: se arma en cada render con el listado
  // vigente, así un refetch que traiga otra solicitud entra en la regla.
  const ruleContext = { vacations, editingId, foreignOccupants };

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
   * no debe borrar lo que el usuario llevaba escrito. `form.reset` NO pasa por
   * `changeDiasInput`, así que nunca recalcula los días guardados.
   */
  useEffect(() => {
    form.reset(editingId ? editValuesRef.current : emptyValues);
    firedRef.current = { ...NO_FIRED };
    diasSourceRef.current = editingId ? "stored" : "auto";
  }, [editingId, emptyValues, form]);

  /**
   * Reevalúa las reglas cruzadas que YA SE DISPARARON (`firedRef`), en ambos
   * sentidos (limpia o repone), con los valores NUEVOS de los campos que
   * cambiaron. Mismo mecanismo que en evaluaciones.
   */
  const revalidateCrossRules = (changes: Partial<VacationFormValues>) => {
    (["fecha_fin", "dias_solicitados"] as CrossRuleField[]).forEach((field) => {
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

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  /** Sugerencia de días para unos valores dados (también la usa la ayuda del campo). */
  const getDiasSuggestion = (
    values: Pick<VacationFormValues, "empleado" | "fecha_inicio" | "fecha_fin">
  ) =>
    suggestDiasSolicitados({
      employee: employeeById.get(values.empleado),
      shifts,
      fechaInicio: values.fecha_inicio,
      fechaFin: values.fecha_fin,
    });

  /**
   * Cambio de empleado o de una fecha (D1). Solo si el valor CAMBIA DE VERDAD
   * recalcula `dias_solicitados` con la sugerencia (o lo vacía si no la hay):
   * volver a elegir el mismo valor no pisa un ajuste manual. Después reevalúa
   * las reglas cruzadas —traslape, orden de fechas y tope de días— con los
   * valores nuevos.
   */
  const changeDiasInput = <F extends DiasInputField>(field: F, nextValue: VacationFormValues[F]) => {
    if (form.state.values[field] === nextValue) {
      return;
    }

    // TS no estrecha `F` dentro del cuerpo genérico: se separa por tipo.
    if (field === "empleado") {
      form.setFieldValue("empleado", nextValue as number);
    } else {
      form.setFieldValue(field as "fecha_inicio" | "fecha_fin", nextValue as string);
    }
    clearFieldErrors(field);

    const nextValues = { ...form.state.values, [field]: nextValue };
    const nextDias = toPrefillValue(getDiasSuggestion(nextValues));
    form.setFieldValue("dias_solicitados", nextDias);
    diasSourceRef.current = "auto";
    clearFieldErrors("dias_solicitados");

    revalidateCrossRules({ [field]: nextValue, dias_solicitados: nextDias });
  };

  /** La persona teclea los días: desde aquí la llegada de datos ya no los pisa. */
  const markDiasManual = () => {
    diasSourceRef.current = "manual";
    clearFieldErrors("dias_solicitados");
  };

  /**
   * Sugerencia vigente con los valores y catálogos actuales. Cambia cuando la
   * persona cambia el empleado o una fecha (ya aplicado por `changeDiasInput`)
   * y también cuando LLEGA o cambia un catálogo que la alimenta: turnos o
   * empleados que cargan después de elegir las fechas.
   */
  const autoDias = toPrefillValue(
    getDiasSuggestion({
      empleado: watchedEmpleado,
      fecha_inicio: watchedFechaInicio,
      fecha_fin: watchedFechaFin,
    })
  );

  /**
   * Sincroniza el campo con la sugerencia cuando llegan los datos, SOLO si su
   * valor vigente también es automático: un valor tecleado (`manual`) o el
   * guardado de una solicitud en edición (`stored`) nunca se pisan. Reevalúa
   * la regla de días si ya se había disparado (p. ej. un "requeridos" de un
   * envío previo a que cargara el catálogo). Es idempotente: si el campo ya
   * tiene la sugerencia, no hace nada.
   *
   * `useEffectEvent`: lee el estado vigente del form y de las reglas sin ser
   * dependencia; el efecto solo se dispara cuando cambia la sugerencia.
   */
  const syncAutoDias = useEffectEvent((nextDias: string) => {
    if (diasSourceRef.current !== "auto" || form.state.values.dias_solicitados === nextDias) {
      return;
    }
    form.setFieldValue("dias_solicitados", nextDias);
    revalidateCrossRules({ dias_solicitados: nextDias });
  });
  useEffect(() => {
    syncAutoDias(autoDias);
  }, [autoDias]);

  // Expone estado combinado de carga/mutación.
  const isPending = isCreating || isUpdating || isLoading;

  // Limpia estado y hace scroll superior suave.
  const handleReset = () => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
    firedRef.current = { ...NO_FIRED };
    diasSourceRef.current = isEditing ? "stored" : "auto";
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
  const formKey = isEditing ? `vacation-edit-${editingId ?? "ready"}` : "vacation-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    empleadoOptions,
    isLoadingEmployees,
    isErrorEmployees,
    isLoadingShifts,
    isErrorShifts,
    getError,
    getDiasSuggestion,
    changeDiasInput,
    markDiasManual,
    clearFieldErrors,
    revalidateCrossRules,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
