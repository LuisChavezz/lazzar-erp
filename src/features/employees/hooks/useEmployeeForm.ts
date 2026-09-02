"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { usePositions } from "@/src/features/positions/hooks/usePositions";
import { EmployeeFormSchema, EmployeeFormValues } from "../schemas/employee.schema";
import { useCreateEmployee } from "./useCreateEmployee";
import { useUpdateEmployee } from "./useUpdateEmployee";
import { Employee, EmployeeCreate } from "../interfaces/employee.interface";

interface UseEmployeeFormParams {
  onSuccess: () => void;
  employeeToEdit?: Employee | null;
}

type EmployeeFormField = keyof EmployeeFormValues;

/** Campo opcional nullable en backend: vacío viaja como null, no como "". */
const emptyToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export function useEmployeeForm({ onSuccess, employeeToEdit }: UseEmployeeFormParams) {
  // Determina modo creación/edición para mantener el flujo existente.
  const isEditing = Boolean(employeeToEdit?.id);

  // Empresa del workspace activo: se exige para dar de alta un empleado.
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);

  // Catálogos que alimentan los tres selects de FK.
  // Las sucursales se leen de `mis-sucursales` (useCompanyBranches) y NO de
  // `/nucleo/sucursales/`: ese endpoint expone la PK como `id_sucursal` y no
  // trae `id`, mientras que este devuelve `id` = PK y ya viene acotado a las
  // sucursales que el usuario tiene permitidas en la empresa activa.
  const { branches, isLoading: isLoadingBranches } = useCompanyBranches(companyId);
  const { departments, isLoading: isLoadingDepartments } = useDepartments();
  const { positions, isLoading: isLoadingPositions } = usePositions();

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Mantiene estado local de envío para bloquear controles durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de validación cliente y servidor para cada campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<EmployeeFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<EmployeeFormField, string>>>({});

  // Define valores vacíos del formulario. Los FK arrancan en 0 (centinela de
  // "Seleccionar...") y el schema los rechaza mientras sigan así.
  const emptyValues = useMemo<EmployeeFormValues>(
    () => ({
      nombre: "",
      apellido_paterno: "",
      apellido_materno: "",
      fecha_nacimiento: "",
      curp: "",
      rfc: "",
      email: "",
      telefono: "",
      numero_empleado: "",
      sucursal: 0,
      departamento: 0,
      puesto: 0,
      fecha_ingreso: "",
      fecha_baja: "",
    }),
    []
  );

  // Deriva valores de edición.
  const editValues = useMemo<EmployeeFormValues>(
    () =>
      employeeToEdit
        ? {
            nombre: employeeToEdit.nombre,
            apellido_paterno: employeeToEdit.apellido_paterno,
            apellido_materno: employeeToEdit.apellido_materno ?? "",
            fecha_nacimiento: employeeToEdit.fecha_nacimiento ?? "",
            curp: employeeToEdit.curp ?? "",
            rfc: employeeToEdit.rfc ?? "",
            email: employeeToEdit.email ?? "",
            telefono: employeeToEdit.telefono ?? "",
            numero_empleado: employeeToEdit.numero_empleado,
            sucursal: employeeToEdit.sucursal,
            departamento: employeeToEdit.departamento,
            puesto: employeeToEdit.puesto,
            fecha_ingreso: employeeToEdit.fecha_ingreso,
            fecha_baja: employeeToEdit.fecha_baja ?? "",
          }
        : emptyValues,
    [emptyValues, employeeToEdit]
  );

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setHookError = (field: EmployeeFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createEmployee, isPending: isCreating } = useCreateEmployee(setHookError);
  const { mutateAsync: updateEmployee, isPending: isUpdating } = useUpdateEmployee(setHookError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: EmployeeFormField) => {
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

  // Valida un solo campo en blur.
  const validateField = (field: EmployeeFormField, value: EmployeeFormValues[EmployeeFormField]) => {
    const fieldSchema = EmployeeFormSchema.shape[field];
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
  const validateForm = (values: EmployeeFormValues) => {
    const parsed = EmployeeFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<EmployeeFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as EmployeeFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  // Entrega error compatible con componentes visuales actuales.
  const getError = (field: EmployeeFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
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
        toast.error("Selecciona una empresa antes de registrar un empleado");
        return;
      }

      setIsLoading(true);
      try {
        // `apellido_materno` y `telefono` son blank pero NO null en el modelo:
        // viajan como cadena vacía. El resto de opcionales sí son nullable.
        const payload: EmployeeCreate = {
          sucursal: value.sucursal,
          departamento: value.departamento,
          puesto: value.puesto,
          numero_empleado: value.numero_empleado.trim().toUpperCase(),
          nombre: value.nombre.trim().toUpperCase(),
          apellido_paterno: value.apellido_paterno.trim().toUpperCase(),
          apellido_materno: value.apellido_materno.trim().toUpperCase(),
          fecha_nacimiento: emptyToNull(value.fecha_nacimiento),
          curp: emptyToNull(value.curp.toUpperCase()),
          rfc: emptyToNull(value.rfc.toUpperCase()),
          email: emptyToNull(value.email),
          telefono: value.telefono.trim(),
          fecha_ingreso: value.fecha_ingreso,
        };

        if (isEditing && employeeToEdit) {
          // `fecha_baja` viaja SOLO cuando el empleado está inactivo, que es el
          // mismo criterio con el que el formulario decide renderizar el campo.
          // Sobre un empleado activo el campo está oculto, así que enviarlo
          // reescribiría a ciegas un valor que nadie puede ver ni corregir —
          // en particular el que el backend acaba de limpiar al reactivarlo.
          // Al omitirlo, el PATCH lo deja intacto.
          if (employeeToEdit.activo === false) {
            payload.fecha_baja = emptyToNull(value.fecha_baja);
          }
          await updateEmployee({
            id: employeeToEdit.id,
            empresa: employeeToEdit.empresa,
            ...payload,
          });
        } else {
          await createEmployee(payload);
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
  const formKey = isEditing ? `employee-edit-${employeeToEdit?.id ?? "ready"}` : "employee-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    branches,
    isLoadingBranches,
    departments,
    isLoadingDepartments,
    positions,
    isLoadingPositions,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
