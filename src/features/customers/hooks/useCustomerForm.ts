"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CustomerFormSchema, CustomerFormValues } from "../schemas/customer.schema";
import { Customer } from "../interfaces/customer.interface";
import { useCreateCustomer } from "./useCreateCustomer";
import { useUpdateCustomer } from "./useUpdateCustomer";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useSatInfo } from "../../sat/hooks/useSatInfo";

interface UseCustomerFormParams {
  onSuccess?: () => void;
  onCreated?: (customer: Customer) => void;
  customerToEdit?: Customer | null;
  invalidateOrderOnboarding?: boolean;
}

type CustomerFormField = keyof CustomerFormValues;

const scrollToFirstValidationError = (formElement: HTMLFormElement, issuePaths: string[]) => {
  if (issuePaths.length === 0) {
    return;
  }

  const normalizedIssuePaths = issuePaths.filter(Boolean);
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

  const firstInvalidControl = controls.find((control) =>
    normalizedIssuePaths.some(
      (path) =>
        path === control.name ||
        path.startsWith(`${control.name}.`) ||
        control.name.startsWith(`${path}.`)
    )
  );

  if (!firstInvalidControl) {
    return;
  }

  firstInvalidControl.scrollIntoView({ behavior: "smooth", block: "center" });
  firstInvalidControl.focus({ preventScroll: true });
};

// Estado base del formulario para modo creación.
// También sirve como fallback cuando no existe cliente en edición.
export const emptyValues: CustomerFormValues = {
  razon_social: "",
  nombre: "",
  telefono: "",
  correo: "",
  rfc: "",
  direccion_fiscal: "",
  colonia: "",
  codigo_postal: "",
  ciudad: "",
  estado: "",
  giro_empresarial: "",
  sat_regimen_fiscal: 0,
  sat_uso_cfdi: 0,
};

export function useCustomerForm({
  onSuccess,
  onCreated,
  customerToEdit,
  invalidateOrderOnboarding = false,
}: UseCustomerFormParams) {
  // Contexto de empresa activa y catálogos SAT requeridos por el formulario.
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const { data: satInfo, isLoading: isSatInfoLoading } = useSatInfo();
  const isEditing = Boolean(customerToEdit?.id);
  const formRef = useRef<HTMLFormElement>(null);

  const [clientErrors, setClientErrors] = useState<Partial<Record<CustomerFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<CustomerFormField, string>>>({});

  const regimenesFiscales = useMemo(() => satInfo?.regimenes_fiscales ?? [], [satInfo]);
  const usosCfdi = useMemo(() => satInfo?.usos_cfdi ?? [], [satInfo]);

  // Valores de edición derivados del cliente recibido por props.
  // Se normalizan catálogos SAT para evitar seleccionar IDs inexistentes.
  const editValues = useMemo<CustomerFormValues>(() => {
    if (!customerToEdit) {
      return emptyValues;
    }

    const hasRegimen = regimenesFiscales.some(
      (item) => item.id_sat_regimen_fiscal === customerToEdit.sat_regimen_fiscal
    );
    const hasUsoCfdi = usosCfdi.some((item) => item.id_sat_uso_cfdi === customerToEdit.sat_uso_cfdi);

    return {
      razon_social: customerToEdit.razon_social,
      nombre: customerToEdit.nombre,
      telefono: customerToEdit.telefono,
      correo: customerToEdit.correo,
      rfc: customerToEdit.rfc,
      direccion_fiscal: customerToEdit.direccion_fiscal,
      colonia: customerToEdit.colonia,
      codigo_postal: customerToEdit.codigo_postal,
      ciudad: customerToEdit.ciudad,
      estado: customerToEdit.estado,
      giro_empresarial: customerToEdit.giro_empresarial,
      sat_regimen_fiscal: hasRegimen ? customerToEdit.sat_regimen_fiscal : 0,
      sat_uso_cfdi: hasUsoCfdi ? customerToEdit.sat_uso_cfdi : 0,
    };
  }, [customerToEdit, regimenesFiscales, usosCfdi]);

  // Adaptador de errores del backend (hooks de mutación) hacia estado local de errores.
  const setHookError = ((field: CustomerFormField, error: { message?: string }) => {
    if (!error?.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  }) as never;

  const { mutateAsync: createCustomer, isPending: isCreating } = useCreateCustomer({
    setError: setHookError,
    invalidateOrderOnboarding,
  });
  const { mutateAsync: updateCustomer, isPending: isUpdating } = useUpdateCustomer(setHookError);

  // Limpia errores locales de un campo específico.
  const clearFieldErrors = (field: CustomerFormField) => {
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

  // Validación por campo (onBlur) usando el schema Zod.
  const validateField = (field: CustomerFormField, value: CustomerFormValues[CustomerFormField]) => {
    const fieldSchema = CustomerFormSchema.shape[field];
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

  // Validación completa (onSubmit) con Zod para frenar envío inválido.
  const validateForm = (values: CustomerFormValues) => {
    const parsed = CustomerFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return { success: true as const, issuePaths: [] as string[] };
    }
    const nextErrors: Partial<Record<CustomerFormField, string>> = {};
    const issuePaths = parsed.error.issues
      .map((issue) => issue.path.map((segment) => String(segment)).join("."))
      .filter(Boolean);
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as CustomerFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });
    setClientErrors(nextErrors);
    return { success: false as const, issuePaths };
  };

  const getError = (field: CustomerFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as never) : undefined;
  };

  // TanStack Form centraliza estado y submit.
  // Aquí se decide creación/edición y se ejecutan mutaciones.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      const validationResult = validateForm(value);
      if (!validationResult.success) {
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

      if (!selectedCompany.id) {
        toast.error("Selecciona una empresa para continuar");
        return;
      }

      if (isEditing && customerToEdit) {
        const updatedCustomer = await updateCustomer({
          id: Number(customerToEdit.id),
          empresa: customerToEdit.empresa ?? selectedCompany.id,
          ...value,
        });

        if (!updatedCustomer) {
          return;
        }

        onCreated?.(updatedCustomer);
        onSuccess?.();
        return;
      }

      const createdCustomer = await createCustomer({
        empresa: selectedCompany.id,
        ...value,
      });

      if (!createdCustomer) {
        return;
      }

      onCreated?.(createdCustomer);
      form.reset(emptyValues);
      setClientErrors({});
      setServerErrors({});
      onSuccess?.();
    },
  });

  const isPending = isCreating || isUpdating;

  // Limpieza/restablecimiento manual:
  // - creación: vuelve a emptyValues
  // - edición: vuelve a los valores cargados del cliente (editValues)
  const handleReset = () => {
    form.reset(isEditing ? editValues : emptyValues);
    setClientErrors({});
    setServerErrors({});
    toast.success(isEditing ? "Cliente restablecido correctamente" : "Formulario limpiado correctamente");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleTextChange = (field: CustomerFormField, value: string, onChange: (next: string) => void) => {
    onChange(value);
    clearFieldErrors(field);
  };

  const handleNumberChange = (field: CustomerFormField, value: number, onChange: (next: number) => void) => {
    onChange(value);
    clearFieldErrors(field);
  };

  const handleFieldBlur = (field: CustomerFormField, value: CustomerFormValues[CustomerFormField], onBlur: () => void) => {
    onBlur();
    validateField(field, value);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  const formKey = isEditing ? `customer-edit-${customerToEdit?.id ?? "ready"}` : "customer-new";

  return {
    form,
    formRef,
    formKey,
    isEditing,
    isPending,
    isSatInfoLoading,
    regimenesFiscales,
    usosCfdi,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleTextChange,
    handleNumberChange,
    handleFieldBlur,
    handleFormSubmit,
  };
}
