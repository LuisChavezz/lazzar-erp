"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import {
  ContractFormFields,
  ContractFormSchema,
  ContractFormValues,
  FECHA_RANGE_MESSAGE,
  isFechaRangeValid,
} from "../schemas/contract.schema";
import { useCreateContract } from "./useCreateContract";
import { useUpdateContract } from "./useUpdateContract";
import { Contract, ContractCreate } from "../interfaces/contract.interface";

interface UseContractFormParams {
  onSuccess: () => void;
  contractToEdit?: Contract | null;
}

type ContractFormField = keyof ContractFormValues;

export interface EmployeeOption {
  id: number;
  label: string;
}

/** Cadena recortada, o `null` si queda vacía: los opcionales son nullable. */
const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export function useContractForm({ onSuccess, contractToEdit }: UseContractFormParams) {
  // Determina modo creación/edición para mantener el flujo existente.
  const isEditing = Boolean(contractToEdit?.id);

  // No se lee el workspace: `empresa` nunca viaja, el backend la resuelve desde
  // `empleado`. Ver `ContractCreate`.

  // Catálogo de empleados que alimenta el select del FK obligatorio.
  const {
    employees,
    isLoading: isLoadingEmployees,
    isError: isErrorEmployees,
  } = useEmployees();

  /**
   * Opciones del select de empleado: solo empleados ACTIVOS, porque no tiene
   * sentido dar de alta un contrato a alguien dado de baja.
   *
   * En edición, si el empleado actual del contrato está inactivo se agrega de
   * todos modos: sin él, el select no tendría opción para el valor guardado,
   * mostraría "Seleccionar..." y el usuario perdería el vínculo sin notarlo.
   * Si ni siquiera aparece en el catálogo, se pinta con su ID.
   */
  const currentEmployeeId = contractToEdit?.empleado ?? null;
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
  const [clientErrors, setClientErrors] = useState<Partial<Record<ContractFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<ContractFormField, string>>>({});

  // Define valores vacíos del formulario. `empleado: 0` es el centinela de
  // "Seleccionar..." y el schema lo rechaza mientras siga así. `tipo` y
  // `estado` arrancan en el default del backend y se envían SIEMPRE.
  const emptyValues = useMemo<ContractFormValues>(
    () => ({
      empleado: 0,
      tipo: "indefinido",
      fecha_inicio: "",
      fecha_fin: "",
      salario: "",
      estado: "activo",
      archivo_url: "",
      observaciones: "",
      prestaciones: "",
    }),
    []
  );

  // Deriva valores de edición.
  const editValues = useMemo<ContractFormValues>(
    () =>
      contractToEdit
        ? {
            empleado: contractToEdit.empleado,
            tipo: contractToEdit.tipo,
            fecha_inicio: contractToEdit.fecha_inicio,
            fecha_fin: contractToEdit.fecha_fin ?? "",
            salario: contractToEdit.salario,
            estado: contractToEdit.estado,
            archivo_url: contractToEdit.archivo_url ?? "",
            observaciones: contractToEdit.observaciones ?? "",
            prestaciones: contractToEdit.prestaciones ?? "",
          }
        : emptyValues,
    [emptyValues, contractToEdit]
  );

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setHookError = (field: ContractFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createContract, isPending: isCreating } = useCreateContract(setHookError);
  const { mutateAsync: updateContract, isPending: isUpdating } = useUpdateContract(setHookError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: ContractFormField) => {
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

  // Valida un solo campo en blur. Se usa `ContractFormFields` y no
  // `ContractFormSchema.shape`: el schema lleva un `refine` de objeto que ya no
  // expone `.shape`.
  const validateField = (field: ContractFormField, value: ContractFormValues[ContractFormField]) => {
    const fieldSchema = ContractFormFields[field];
    const parsed = fieldSchema.safeParse(value);

    // El schema de UN campo de `fecha_fin` es `z.string()` y siempre pasa, así
    // que sin esto el blur de `fecha_fin` borraba el error de la regla cruzada
    // aunque el rango siguiera inválido. Y como tras un submit fallido
    // `scrollToFirstValidationError` deja el foco en `fecha_fin`, bastaba un
    // clic en cualquier otro campo para que el error desapareciera. Por eso su
    // blur evalúa también la regla, con la fecha de inicio vigente.
    if (
      field === "fecha_fin" &&
      parsed.success &&
      !isFechaRangeValid(form.getFieldValue("fecha_inicio"), value as string)
    ) {
      setClientErrors((prev) => ({ ...prev, fecha_fin: FECHA_RANGE_MESSAGE }));
      return false;
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
  const validateForm = (values: ContractFormValues) => {
    const parsed = ContractFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return { success: true as const, issuePaths: [] };
    }

    const nextErrors: Partial<Record<ContractFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ContractFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return { success: false as const, issuePaths: Object.keys(nextErrors) };
  };

  // Entrega error compatible con componentes visuales actuales.
  const getError = (field: ContractFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // Controla submit con la misma lógica original.
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
        // `estado` y `tipo` viajan SIEMPRE, nunca se omiten. Los opcionales
        // viajan como null cuando quedan vacíos: el backend los declara
        // nullable. `salario` va como string para no perder precisión.
        const payload: ContractCreate = {
          empleado: value.empleado,
          tipo: value.tipo,
          fecha_inicio: value.fecha_inicio,
          fecha_fin: toNullable(value.fecha_fin),
          salario: value.salario.trim(),
          estado: value.estado,
          archivo_url: toNullable(value.archivo_url),
          observaciones: toNullable(value.observaciones),
          prestaciones: toNullable(value.prestaciones),
        };

        if (isEditing && contractToEdit) {
          await updateContract({ id: contractToEdit.id, ...payload });
        } else {
          await createContract(payload);
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
  const editedContractId = contractToEdit?.id ?? null;
  useEffect(() => {
    form.reset(editedContractId ? editValuesRef.current : emptyValues);
  }, [editedContractId, emptyValues, form]);

  /**
   * Reevalúa la regla cruzada de fechas cuando cambia `fecha_inicio`.
   *
   * El `refine` deja su error bajo `fecha_fin`, pero `clearFieldErrors` solo
   * limpia el campo que se editó: si el usuario corregía el rango moviendo
   * `fecha_inicio`, el mensaje seguía bajo `fecha_fin` aunque ya no aplicara.
   *
   * Reevalúa en AMBOS sentidos (limpia o repone), no solo limpia: al teclear en
   * un `<input type="date">` el navegador emite valores intermedios (`""`,
   * `"0002-08-15"`, `"0202-08-15"`...) que cumplen la regla un instante. Si
   * solo limpiara, uno de esos borraría el error aunque la fecha final siga
   * siendo inválida; reevaluando, el estado sigue siempre al valor vigente.
   *
   * Solo actúa tras el primer intento de envío: antes de eso no se reprocha
   * nada mientras se escribe, igual que en el resto del formulario. Con una de
   * las dos fechas vacía no toca nada (la regla no aplica y el vacío es casi
   * siempre un intermedio del tecleo). Solo escribe estado de errores, nunca
   * dispara validaciones, así que no hay ciclo posible.
   *
   * Al limpiar se va también el error de servidor: el 400 del backend para
   * este mismo caso llega bajo `fecha_fin` con la misma regla.
   */
  const revalidateFechaRange = (fechaInicio: string, fechaFin: string) => {
    if (form.state.submissionAttempts === 0 || !fechaInicio || !fechaFin) {
      return;
    }

    if (isFechaRangeValid(fechaInicio, fechaFin)) {
      clearFieldErrors("fecha_fin");
    } else {
      setClientErrors((prev) =>
        prev.fecha_fin === FECHA_RANGE_MESSAGE
          ? prev
          : { ...prev, fecha_fin: FECHA_RANGE_MESSAGE }
      );
    }
  };

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
  const formKey = isEditing ? `contract-edit-${contractToEdit?.id ?? "ready"}` : "contract-new";

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
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
