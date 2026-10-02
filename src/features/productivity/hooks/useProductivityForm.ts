"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { stripTrailingDecimalPoint, toSendableDecimal } from "@/src/utils/decimal";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import type { Employee } from "@/src/features/employees/interfaces/employee.interface";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { useUnitsOfMeasure } from "@/src/features/units-of-measure/hooks/useUnitsOfMeasure";
import type { UnitOfMeasure } from "@/src/features/units-of-measure/interfaces/unit-of-measure.interface";
import {
  ProductivityFormFields,
  ProductivityFormSchema,
  ProductivityFormValues,
} from "../schemas/productivity.schema";
import { ESTADO_BORRADOR } from "../constants/productivityChoices";
import { Productivity, ProductivityWrite } from "../interfaces/productivity.interface";
import { useCreateProductivity } from "./useCreateProductivity";
import { useUpdateProductivity } from "./useUpdateProductivity";
import { PRODUCTIVITY_KEY } from "./useProductivity";
import { verifyProductivityEstado } from "./verifyProductivityEstado";
import {
  PRODUCTIVITY_GONE_MESSAGE,
  productivityEstadoChangedMessage,
} from "./productivityErrorMessages";

interface UseProductivityFormParams {
  onSuccess: () => void;
  /** Solo se edita un registro en borrador. */
  recordToEdit?: Productivity | null;
}

type ProductivityFormField = keyof ProductivityFormValues;

export interface SelectOption {
  id: number;
  label: string;
}

export const SIN_DEPARTAMENTO_MESSAGE =
  "El empleado no tiene departamento asignado. Asígnale uno en Capital Humano → Empleados antes de registrar su productividad.";
const SIN_EMPRESA_MESSAGE = "No se pudo determinar la empresa del empleado.";

/**
 * Opciones del selector de empleado: solo ACTIVOS, más el valor guardado si
 * está inactivo (con "(inactivo)") para no perder el vínculo al editar. Mismo
 * criterio que evaluaciones (copia local, a propósito).
 */
const buildEmployeeOptions = (
  employees: Employee[],
  currentId: number | null
): SelectOption[] => {
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

/**
 * Opciones de unidad de medida: el catálogo solo lista ACTIVAS. Al editar, la
 * unidad guardada que ya no aparece (desactivada) se conserva con "Unidad #id".
 */
const buildUnitOptions = (units: UnitOfMeasure[], currentId: number | null): SelectOption[] => {
  const options = units
    .filter((unit) => unit.activo)
    .map((unit) => ({ id: unit.id, label: `${unit.nombre} (${unit.clave})` }));

  if (currentId && !options.some((option) => option.id === currentId)) {
    options.unshift({ id: currentId, label: `Unidad #${currentId}` });
  }

  return options;
};

/** `empresa` y `departamento` de un registro: nunca son campos del formulario. */
interface DerivedOwnership {
  empresa: number | null;
  departamento: number | null;
}

export function useProductivityForm({ onSuccess, recordToEdit }: UseProductivityFormParams) {
  const isEditing = Boolean(recordToEdit?.id);
  const editingId = recordToEdit?.id ?? null;

  const {
    employees,
    isLoading: isLoadingEmployees,
    isError: isErrorEmployees,
  } = useEmployees();
  const { departments } = useDepartments();
  const { units, isLoading: isLoadingUnits, isError: isErrorUnits } = useUnitsOfMeasure();
  const queryClient = useQueryClient();

  const empleadoOptions = buildEmployeeOptions(employees, recordToEdit?.empleado ?? null);
  const unidadOptions = buildUnitOptions(units, recordToEdit?.meta_unidad ?? null);

  const formRef = useRef<HTMLFormElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Envío en curso, síncrono (ver `onSubmit`).
  const submittingRef = useRef(false);

  const [clientErrors, setClientErrors] = useState<Partial<Record<ProductivityFormField, string>>>(
    {}
  );
  const [serverErrors, setServerErrors] = useState<Partial<Record<ProductivityFormField, string>>>(
    {}
  );

  /**
   * Valores iniciales del formulario. Sin efecto de repoblado ni `useMemo`:
   * `MainDialog` desmonta su contenido al cerrarse, así que cada apertura
   * monta este hook de nuevo con el `recordToEdit` vigente, y `recordToEdit`
   * no cambia con el diálogo abierto (es la foto tomada al pulsar "Editar").
   */
  const initialValues: ProductivityFormValues = recordToEdit
    ? {
        empleado: recordToEdit.empleado,
        fecha: recordToEdit.fecha,
        meta_unidad: recordToEdit.meta_unidad,
        // Tal cual llegan ("100.00"), igual que la celda de la tabla.
        meta: recordToEdit.meta ?? "",
        resultado: recordToEdit.resultado ?? "",
        descripcion: recordToEdit.descripcion ?? "",
      }
    : {
        empleado: 0,
        fecha: "",
        meta_unidad: 0,
        meta: "",
        resultado: "",
        descripcion: "",
      };

  /**
   * `empresa` y `departamento` del empleado elegido. Al editar, mientras el
   * empleado sea el MISMO del registro se conserva lo guardado (foto), aunque
   * el empleado haya cambiado de departamento después; si se elige otro, se
   * derivan del nuevo.
   */
  const resolveOwnership = (empleadoId: number): DerivedOwnership => {
    if (recordToEdit && empleadoId === recordToEdit.empleado) {
      return { empresa: recordToEdit.empresa, departamento: recordToEdit.departamento };
    }
    const employee = employees.find((item) => item.id === empleadoId);
    return {
      empresa: employee?.empresa || null,
      departamento: employee?.departamento || null,
    };
  };

  /** Bloqueo del guardado por datos derivados faltantes; se pinta bajo `empleado`. */
  const getOwnershipError = (empleadoId: number): string | null => {
    if (empleadoId <= 0) {
      return null;
    }
    const ownership = resolveOwnership(empleadoId);
    if (!ownership.departamento) {
      return SIN_DEPARTAMENTO_MESSAGE;
    }
    if (!ownership.empresa) {
      return SIN_EMPRESA_MESSAGE;
    }
    return null;
  };

  const setServerFieldError = (field: ProductivityFormField, message: string) => {
    setServerErrors((prev) => ({ ...prev, [field]: message }));
  };

  const { mutateAsync: createRecord, isPending: isCreating } =
    useCreateProductivity(setServerFieldError);
  const { mutateAsync: updateRecord, isPending: isUpdating } =
    useUpdateProductivity(setServerFieldError);

  const clearFieldErrors = (field: ProductivityFormField) => {
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

  const setClientError = (field: ProductivityFormField, message: string) => {
    setClientErrors((prev) => (prev[field] === message ? prev : { ...prev, [field]: message }));
  };

  // Valida un solo campo en blur. `empleado` evalúa también la derivación.
  const validateField = (
    field: ProductivityFormField,
    value: ProductivityFormValues[ProductivityFormField]
  ) => {
    const parsed = ProductivityFormFields[field].safeParse(value);

    if (parsed.success && field === "empleado") {
      const message = getOwnershipError(value as number);
      if (message) {
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

  const validateForm = (values: ProductivityFormValues) => {
    const nextErrors: Partial<Record<ProductivityFormField, string>> = {};

    const parsed = ProductivityFormSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as ProductivityFormField;
        if (!field || nextErrors[field]) {
          return;
        }
        nextErrors[field] = issue.message;
      });
    }

    const ownershipError = getOwnershipError(values.empleado);
    if (ownershipError && !nextErrors.empleado) {
      nextErrors.empleado = ownershipError;
    }

    setClientErrors(nextErrors);
    const issuePaths = Object.keys(nextErrors);
    return issuePaths.length === 0
      ? { success: true as const, issuePaths: [] }
      : { success: false as const, issuePaths };
  };

  const getError = (field: ProductivityFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  /** El envío en sí, sin la guarda de doble envío (vive en `onSubmit`). */
  const submitRecord = async (value: ProductivityFormValues) => {
    setServerErrors({});

    // Vía RÁPIDA contra la caché (lectura puntual, sin suscribir el formulario
    // al listado); la definitiva es `verifyProductivityEstado`.
    if (isEditing && editingId !== null) {
      const records = queryClient.getQueryData<Productivity[]>(PRODUCTIVITY_KEY) ?? [];
      const current = records.find((record) => record.id === editingId);
      if (!current || current.estado !== ESTADO_BORRADOR) {
        toast.error(
          current ? productivityEstadoChangedMessage(current.estado) : PRODUCTIVITY_GONE_MESSAGE
        );
        void queryClient.invalidateQueries({ queryKey: PRODUCTIVITY_KEY });
        onSuccess();
        return;
      }
    }

    const validationResult = validateForm(value);
    if (!validationResult.success) {
      scrollToFirstValidationError(formRef.current, validationResult.issuePaths);
      return;
    }

    const ownership = resolveOwnership(value.empleado);
    if (!ownership.empresa || !ownership.departamento) {
      // Inalcanzable tras `validateForm`; solo estrecha los tipos.
      return;
    }

    // `isLoading` cubre la guarda Y la escritura.
    setIsLoading(true);
    try {
      if (isEditing && editingId !== null) {
        const check = await verifyProductivityEstado(queryClient, editingId, ESTADO_BORRADOR);
        if (check === "stale") {
          onSuccess();
        }
        if (check !== "ok") {
          return;
        }
      }

      // Campo por campo, a propósito: NUNCA viajan `id`, `creado_por` ni
      // `observaciones`. Los decimales vacíos van como `null`, igual que la
      // descripción vacía (campo nullable).
      const payload: ProductivityWrite = {
        empresa: ownership.empresa,
        departamento: ownership.departamento,
        empleado: value.empleado,
        fecha: value.fecha,
        meta_unidad: value.meta_unidad,
        meta: toSendableDecimal(stripTrailingDecimalPoint(value.meta), 2),
        resultado: toSendableDecimal(stripTrailingDecimalPoint(value.resultado), 2),
        descripcion: value.descripcion.trim() || null,
      };

      if (isEditing && editingId !== null) {
        // La edición no toca `estado`: la guarda ya confirmó que es borrador.
        await updateRecord({ id: editingId, ...payload });
      } else {
        await createRecord({ ...payload, estado: "borrador" });
      }

      onSuccess();
    } catch {
      // El `onError` de la mutación ya avisó y pintó los errores por campo.
    } finally {
      setIsLoading(false);
    }
  };

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      // Guarda SÍNCRONA contra el doble envío en el mismo tick. Cubre la guarda
      // de red y la escritura, y se libera en toda salida.
      if (submittingRef.current) {
        return;
      }
      submittingRef.current = true;
      try {
        await submitRecord(value);
      } finally {
        submittingRef.current = false;
      }
    },
  });

  // Departamento derivado del empleado elegido, solo para mostrarlo.
  const watchedEmpleado = useStore(form.store, (state) => state.values.empleado);
  const watchedOwnership = watchedEmpleado > 0 ? resolveOwnership(watchedEmpleado) : null;
  const departmentNameById = new Map(
    departments.map((department) => [department.id_departamento, department.nombre])
  );
  const departamentoLabel = !watchedOwnership
    ? "Selecciona un empleado"
    : watchedOwnership.departamento
      ? (departmentNameById.get(watchedOwnership.departamento) ??
        `Departamento #${watchedOwnership.departamento}`)
      : "Sin departamento";

  /** Cambio de empleado: limpia sus errores y avisa al instante si no tiene departamento. */
  const changeEmpleado = (nextEmpleado: number) => {
    form.setFieldValue("empleado", nextEmpleado);
    clearFieldErrors("empleado");
    const message = getOwnershipError(nextEmpleado);
    if (message) {
      setClientError("empleado", message);
    }
  };

  const isPending = isCreating || isUpdating || isLoading;

  const handleReset = () => {
    form.reset(initialValues);
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

  return {
    form,
    formRef,
    isPending,
    isEditing,
    empleadoOptions,
    unidadOptions,
    departamentoLabel,
    isLoadingEmployees,
    isErrorEmployees,
    isLoadingUnits,
    isErrorUnits,
    getError,
    changeEmpleado,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
