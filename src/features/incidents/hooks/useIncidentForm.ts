"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import {
  IncidentFormFields,
  IncidentFormSchema,
  IncidentFormValues,
  getAccionesTomadasError,
} from "../schemas/incident.schema";
import { useCreateIncident } from "./useCreateIncident";
import { useUpdateIncident } from "./useUpdateIncident";
import { Incident, IncidentCreate } from "../interfaces/incident.interface";

interface UseIncidentFormParams {
  onSuccess: () => void;
  incidentToEdit?: Incident | null;
}

type IncidentFormField = keyof IncidentFormValues;

export interface EmployeeOption {
  id: number;
  label: string;
}

/** Cadena recortada, o `null` si queda vacía: los opcionales son nullable. */
const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export function useIncidentForm({ onSuccess, incidentToEdit }: UseIncidentFormParams) {
  // Determina modo creación/edición.
  const isEditing = Boolean(incidentToEdit?.id);

  // No se lee el workspace: `empresa` nunca viaja, el backend la resuelve desde
  // `empleado`. Ver `IncidentCreate`.

  // Catálogo de empleados que alimenta el select del FK obligatorio.
  const {
    employees,
    isLoading: isLoadingEmployees,
    isError: isErrorEmployees,
  } = useEmployees();

  /**
   * Opciones del select de empleado: solo empleados ACTIVOS, porque no tiene
   * sentido registrar una incidencia nueva a alguien dado de baja. El catálogo
   * trae activos e inactivos, así que el filtro es de cliente.
   *
   * En edición, si el empleado actual está inactivo se agrega de todos modos:
   * sin él, el select no tendría opción para el valor guardado, mostraría
   * "Seleccionar..." y el usuario perdería el vínculo sin notarlo. Si ni
   * siquiera aparece en el catálogo, se pinta con su ID. Mismo criterio que
   * capacitaciones y contratos.
   */
  const currentEmployeeId = incidentToEdit?.empleado ?? null;
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
  const [clientErrors, setClientErrors] = useState<Partial<Record<IncidentFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<IncidentFormField, string>>>({});

  // ¿La regla de `acciones_tomadas` ya se disparó al menos una vez (por su blur
  // o por submit)? Mientras sea `true`, cada cambio de `estado` la reevalúa.
  // Ver `revalidateAccionesTomadas`.
  const accionesFiredRef = useRef(false);

  // Valores vacíos. `empleado: 0` es el centinela de "Seleccionar..." y el
  // schema lo rechaza mientras siga así. `tipo`, `gravedad` y `estado` arrancan
  // en el default del backend y se envían SIEMPRE.
  const emptyValues = useMemo<IncidentFormValues>(
    () => ({
      empleado: 0,
      tipo: "otro",
      gravedad: "baja",
      estado: "abierto",
      fecha: "",
      descripcion: "",
      acciones_tomadas: "",
    }),
    []
  );

  // Deriva valores de edición.
  const editValues = useMemo<IncidentFormValues>(
    () =>
      incidentToEdit
        ? {
            empleado: incidentToEdit.empleado,
            tipo: incidentToEdit.tipo,
            gravedad: incidentToEdit.gravedad,
            estado: incidentToEdit.estado,
            fecha: incidentToEdit.fecha,
            descripcion: incidentToEdit.descripcion ?? "",
            acciones_tomadas: incidentToEdit.acciones_tomadas ?? "",
          }
        : emptyValues,
    [emptyValues, incidentToEdit]
  );

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setHookError = (field: IncidentFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createIncident, isPending: isCreating } = useCreateIncident(setHookError);
  const { mutateAsync: updateIncident, isPending: isUpdating } = useUpdateIncident(setHookError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: IncidentFormField) => {
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
  const setClientError = (field: IncidentFormField, message: string) => {
    setClientErrors((prev) => (prev[field] === message ? prev : { ...prev, [field]: message }));
  };

  // Valida un solo campo en blur. Se usa `IncidentFormFields` y no
  // `IncidentFormSchema.shape`: el schema lleva un refinamiento de objeto que
  // ya no expone `.shape`.
  const validateField = (field: IncidentFormField, value: IncidentFormValues[IncidentFormField]) => {
    const fieldSchema = IncidentFormFields[field];
    const parsed = fieldSchema.safeParse(value);

    // El schema de UN campo de `acciones_tomadas` es `z.string()` y siempre
    // pasa, así que sin esto su blur borraría el error de la regla cruzada
    // aunque la incidencia siga cerrada sin acciones. Por eso su blur evalúa
    // también la regla, con el `estado` vigente. Mismo arreglo que el blur de
    // `fecha_fin` en capacitaciones.
    if (field === "acciones_tomadas") {
      const message = getAccionesTomadasError(form.getFieldValue("estado"), value as string);
      if (message) {
        accionesFiredRef.current = true;
        setClientError("acciones_tomadas", message);
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
  const validateForm = (values: IncidentFormValues) => {
    const parsed = IncidentFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return { success: true as const, issuePaths: [] };
    }

    const nextErrors: Partial<Record<IncidentFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as IncidentFormField;
      // El schema base de `acciones_tomadas` es `z.string()`: cualquier issue
      // suyo viene de la regla cruzada.
      if (field === "acciones_tomadas") {
        accionesFiredRef.current = true;
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
  const getError = (field: IncidentFormField) => {
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
        // de viajar. `tipo`, `gravedad` y `estado` viajan SIEMPRE.
        // `descripcion` NO es nullable (vacío = ""). `acciones_tomadas` viaja
        // como null cuando queda vacía y, a diferencia de los campos de
        // "Finalizado" en capacitaciones, NO se anula al reabrir: se conserva y
        // se envía tal cual. `activo`, `reportado_por` y `fecha_reporte` nunca
        // viajan (ver `IncidentCreate`).
        const payload: IncidentCreate = {
          empleado: value.empleado,
          tipo: value.tipo,
          gravedad: value.gravedad,
          estado: value.estado,
          fecha: value.fecha,
          descripcion: value.descripcion.trim(),
          acciones_tomadas: toNullable(value.acciones_tomadas),
        };

        if (isEditing && incidentToEdit) {
          await updateIncident({ id: incidentToEdit.id, ...payload });
        } else {
          await createIncident(payload);
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
  const editedIncidentId = incidentToEdit?.id ?? null;
  useEffect(() => {
    form.reset(editedIncidentId ? editValuesRef.current : emptyValues);
    accionesFiredRef.current = false;
  }, [editedIncidentId, emptyValues, form]);

  /**
   * Reevalúa la regla de `acciones_tomadas` cuando cambia `estado`, el otro
   * campo de la regla.
   *
   * El refinamiento deja su error bajo `acciones_tomadas`, pero
   * `clearFieldErrors` solo limpia el campo que se editó: si el usuario
   * corregía volviendo a "Abierto", el mensaje seguiría ahí aunque ya no
   * aplicara. Reevalúa en AMBOS sentidos (limpia o repone).
   *
   * Solo actúa si la regla YA SE DISPARÓ (`accionesFiredRef`), por el blur de
   * `acciones_tomadas` o por un submit: antes de eso no se reprocha nada. La
   * guarda NO es `submissionAttempts` —el error también nace del blur— ni "el
   * error está visible ahora". Mismo arreglo que en capacitaciones.
   *
   * El campo nunca se deshabilita ni se vacía: su valor se conserva siempre.
   */
  const revalidateAccionesTomadas = (estado: string) => {
    if (!accionesFiredRef.current) {
      return;
    }

    const message = getAccionesTomadasError(estado, form.getFieldValue("acciones_tomadas"));
    if (message) {
      setClientError("acciones_tomadas", message);
    } else {
      clearFieldErrors("acciones_tomadas");
    }
  };

  // Expone estado combinado de carga/mutación.
  const isPending = isCreating || isUpdating || isLoading;

  // Limpia estado y hace scroll superior suave.
  const handleReset = () => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
    accionesFiredRef.current = false;
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
  const formKey = isEditing ? `incident-edit-${incidentToEdit?.id ?? "ready"}` : "incident-new";

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
    revalidateAccionesTomadas,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
