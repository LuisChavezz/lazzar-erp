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

/**
 * Lleva a la vista el primer campo inválido tras una validación local fallida.
 *
 * "Primero" se resuelve por ORDEN DEL DOM, no por el orden de las claves del
 * objeto de errores: se recorren los controles del formulario tal como están
 * montados y se elige el primero que aparezca entre los inválidos. Con siete
 * secciones, el orden en que Zod emite sus issues no tiene por qué coincidir
 * con lo que el usuario ve de arriba abajo.
 *
 * Es la misma implementación que `useCustomerForm`; se replica aquí porque
 * allí es un `const` de módulo sin exportar. Ver la nota de duplicación.
 */
const scrollToFirstValidationError = (formElement: HTMLFormElement, issuePaths: string[]) => {
  if (issuePaths.length === 0) {
    return;
  }

  const controls = Array.from(
    formElement.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea"
    )
  ).filter(
    (element) =>
      Boolean(element.name) &&
      !element.disabled &&
      !(element instanceof HTMLInputElement && element.type === "hidden")
  );

  const firstInvalidControl = controls.find((control) => issuePaths.includes(control.name));

  if (!firstInvalidControl) {
    return;
  }

  firstInvalidControl.scrollIntoView({ behavior: "smooth", block: "center" });
  firstInvalidControl.focus({ preventScroll: true });
};

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
      sexo: "",
      estado_civil: "",
      // Los defaults del backend son "Mexicana" y "MXN". Se escriben en
      // mayúsculas porque ambos campos llevan `forceUppercase`: si no, el
      // input los PINTARÍA en mayúsculas (clase CSS) mientras el valor
      // enviado seguiría en minúsculas hasta que alguien los editara.
      nacionalidad: "MEXICANA",
      lugar_nacimiento: "",
      curp: "",
      rfc: "",
      nss: "",
      infonavit: "",
      email: "",
      telefono: "",
      calle: "",
      numero_exterior: "",
      numero_interior: "",
      colonia: "",
      codigo_postal: "",
      ciudad: "",
      estado: "",
      banco: "",
      cuenta_bancaria: "",
      clabe: "",
      moneda_pago: "MXN",
      nombre_emergencia: "",
      parentesco_emergencia: "",
      telefono_emergencia: "",
      email_emergencia: "",
      tipo_sangre: "",
      alergias: "",
      enfermedades_cronicas: "",
      foto_url: "",
      observaciones: "",
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
            sexo: employeeToEdit.sexo ?? "",
            estado_civil: employeeToEdit.estado_civil ?? "",
            nacionalidad: employeeToEdit.nacionalidad ?? "",
            lugar_nacimiento: employeeToEdit.lugar_nacimiento ?? "",
            curp: employeeToEdit.curp ?? "",
            rfc: employeeToEdit.rfc ?? "",
            nss: employeeToEdit.nss ?? "",
            infonavit: employeeToEdit.infonavit ?? "",
            email: employeeToEdit.email ?? "",
            telefono: employeeToEdit.telefono ?? "",
            calle: employeeToEdit.calle ?? "",
            numero_exterior: employeeToEdit.numero_exterior ?? "",
            numero_interior: employeeToEdit.numero_interior ?? "",
            colonia: employeeToEdit.colonia ?? "",
            codigo_postal: employeeToEdit.codigo_postal ?? "",
            ciudad: employeeToEdit.ciudad ?? "",
            estado: employeeToEdit.estado ?? "",
            banco: employeeToEdit.banco ?? "",
            cuenta_bancaria: employeeToEdit.cuenta_bancaria ?? "",
            clabe: employeeToEdit.clabe ?? "",
            moneda_pago: employeeToEdit.moneda_pago ?? "",
            nombre_emergencia: employeeToEdit.nombre_emergencia ?? "",
            parentesco_emergencia: employeeToEdit.parentesco_emergencia ?? "",
            telefono_emergencia: employeeToEdit.telefono_emergencia ?? "",
            email_emergencia: employeeToEdit.email_emergencia ?? "",
            tipo_sangre: employeeToEdit.tipo_sangre ?? "",
            alergias: employeeToEdit.alergias ?? "",
            enfermedades_cronicas: employeeToEdit.enfermedades_cronicas ?? "",
            foto_url: employeeToEdit.foto_url ?? "",
            observaciones: employeeToEdit.observaciones ?? "",
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

  // Valida todo el formulario antes de mutar. Devuelve además los campos
  // inválidos para que el submit pueda llevar el primero a la vista.
  const validateForm = (values: EmployeeFormValues) => {
    const parsed = EmployeeFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return { success: true as const, issuePaths: [] as string[] };
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
    return { success: false as const, issuePaths: Object.keys(nextErrors) };
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

      const validationResult = validateForm(value);
      if (!validationResult.success) {
        // En el siguiente frame: `setClientErrors` acaba de programar un
        // re-render y el mensaje de error todavía no está pintado, así que
        // centrar antes movería la vista a una posición que cambia enseguida.
        if (formRef.current) {
          requestAnimationFrame(() => {
            if (!formRef.current) {
              return;
            }
            scrollToFirstValidationError(formRef.current, validationResult.issuePaths);
          });
        }
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
          sexo: value.sexo,
          estado_civil: value.estado_civil,
          nacionalidad: value.nacionalidad.trim().toUpperCase(),
          lugar_nacimiento: value.lugar_nacimiento.trim().toUpperCase(),
          curp: emptyToNull(value.curp.toUpperCase()),
          rfc: emptyToNull(value.rfc.toUpperCase()),
          nss: value.nss.trim(),
          infonavit: value.infonavit.trim().toUpperCase(),
          email: emptyToNull(value.email),
          telefono: value.telefono.trim(),
          calle: value.calle.trim().toUpperCase(),
          numero_exterior: value.numero_exterior.trim().toUpperCase(),
          numero_interior: value.numero_interior.trim().toUpperCase(),
          colonia: value.colonia.trim().toUpperCase(),
          codigo_postal: value.codigo_postal.trim(),
          ciudad: value.ciudad.trim().toUpperCase(),
          estado: value.estado.trim().toUpperCase(),
          banco: value.banco.trim().toUpperCase(),
          cuenta_bancaria: value.cuenta_bancaria.trim(),
          clabe: value.clabe.trim(),
          moneda_pago: value.moneda_pago.trim().toUpperCase(),
          nombre_emergencia: value.nombre_emergencia.trim().toUpperCase(),
          parentesco_emergencia: value.parentesco_emergencia.trim().toUpperCase(),
          telefono_emergencia: value.telefono_emergencia.trim(),
          email_emergencia: value.email_emergencia.trim(),
          tipo_sangre: value.tipo_sangre.trim().toUpperCase(),
          alergias: value.alergias.trim().toUpperCase(),
          enfermedades_cronicas: value.enfermedades_cronicas.trim().toUpperCase(),
          foto_url: value.foto_url.trim(),
          observaciones: value.observaciones.trim().toUpperCase(),
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

  // Mantiene a mano los últimos valores de edición SIN que su identidad sea
  // una dependencia del efecto de abajo. Va declarado antes para que React lo
  // ejecute primero cuando ambos efectos caen en el mismo commit.
  const editValuesRef = useRef(editValues);
  useEffect(() => {
    editValuesRef.current = editValues;
  }, [editValues]);

  /**
   * Repuebla el formulario cuando cambia LA ENTIDAD en edición, identificada
   * por su `id` y no por la identidad del objeto.
   *
   * `editValues` se rederiva cada vez que `employeeToEdit` es un objeto nuevo,
   * y desde el detalle ese objeto viene de `useEmployee`: cualquier refetch en
   * segundo plano lo reemplaza. Dependiendo de él, un refetch a mitad de la
   * captura hacía `form.reset()` y borraba lo que el usuario llevaba escrito
   * en las siete secciones.
   */
  const editedEmployeeId = employeeToEdit?.id ?? null;
  useEffect(() => {
    form.reset(editedEmployeeId ? editValuesRef.current : emptyValues);
  }, [editedEmployeeId, emptyValues, form]);

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
