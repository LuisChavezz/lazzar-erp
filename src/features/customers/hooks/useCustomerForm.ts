"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { normalizeCapturedDecimal } from "@/src/utils/decimal";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import {
  CustomerFormFields,
  CustomerFormSchema,
  CustomerFormValues,
  getCustomerCodigoPostalError,
} from "../schemas/customer.schema";
import { Customer, CustomerCreate } from "../interfaces/customer.interface";
import { useCreateCustomer } from "./useCreateCustomer";
import { useUpdateCustomer } from "./useUpdateCustomer";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useSatInfo } from "../../sat/hooks/useSatInfo";

interface UseCustomerFormParams {
  onSuccess?: () => void;
  onCreated?: (customer: Customer) => void;
  customerToEdit?: Customer | null;
  invalidateOrderOnboarding?: boolean;
  isRfcVerified?: boolean;
  /**
   * `true` solo en el formulario del módulo de clientes. Las altas rápidas
   * (cotización, accesos rápidos) no capturan crédito y no lo envían: el
   * backend lo deja en 0.
   */
  includeCredit?: boolean;
}

type CustomerFormField = keyof CustomerFormValues;

type NormalizedCustomerFormValues = Omit<
  CustomerFormValues,
  "telefono" | "correo"
> & {
  telefono: string;
  correo: string;
};

const normalizeOptionalCustomerFields = (
  values: CustomerFormValues
): NormalizedCustomerFormValues => ({
  ...values,
  telefono: values.telefono ?? "",
  correo: values.correo ?? "",
});

type CreditPayload = Pick<CustomerCreate, "dias_credito" | "limite_credito">;

// Vacío equivale a 0 en ambos campos.
const toCreditPayload = (
  values: Pick<CustomerFormValues, "dias_credito" | "limite_credito">
): Required<CreditPayload> => ({
  dias_credito: Number(values.dias_credito || 0),
  limite_credito: normalizeCapturedDecimal(values.limite_credito) || "0",
});

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
  sat_regimen_fiscal: 0,
  sat_uso_cfdi: 0,
  // Vacíos y no "0"/"0.00": el placeholder ya muestra el cero y así no hay que
  // borrar nada para capturar. Se envían como 0 (ver `toCreditPayload`).
  dias_credito: "",
  limite_credito: "",
};

export function useCustomerForm({
  onSuccess,
  onCreated,
  customerToEdit,
  invalidateOrderOnboarding = false,
  isRfcVerified = false,
  includeCredit = false,
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
      sat_regimen_fiscal: hasRegimen ? customerToEdit.sat_regimen_fiscal : 0,
      sat_uso_cfdi: hasUsoCfdi ? customerToEdit.sat_uso_cfdi : 0,
      dias_credito: String(customerToEdit.dias_credito),
      limite_credito: customerToEdit.limite_credito,
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

  // Validación completa (onSubmit) con Zod para frenar envío inválido.
  const validateForm = (values: CustomerFormValues) => {
    const parsed = CustomerFormSchema.safeParse(values);
    const nextErrors: Partial<Record<CustomerFormField, string>> = {};
    const issuePaths: string[] = [];

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const path = issue.path.map((segment) => String(segment)).join(".");
        if (path) {
          issuePaths.push(path);
        }
        const field = issue.path[0] as CustomerFormField;
        if (!field || nextErrors[field]) {
          return;
        }
        nextErrors[field] = issue.message;
      });
    }

    if (!isRfcVerified) {
      nextErrors.rfc = "Debes verificar el RFC antes de continuar";
      issuePaths.push("rfc");
    }

    if (Object.keys(nextErrors).length === 0) {
      setClientErrors({});
      return { success: true as const, issuePaths: [] as string[] };
    }

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
      const normalizedValues = normalizeOptionalCustomerFields(value);

      const validationResult = validateForm(normalizedValues);
      if (!validationResult.success) {
        scrollToFirstValidationError(formRef.current, validationResult.issuePaths);
        return;
      }

      if (!selectedCompany.id) {
        toast.error("Selecciona una empresa para continuar");
        return;
      }

      // El crédito se arma aparte: `rest` nunca lo lleva.
      const { dias_credito, limite_credito, ...rest } = normalizedValues;
      const credit = toCreditPayload({ dias_credito, limite_credito });

      if (isEditing && customerToEdit) {
        // Solo se manda el campo de crédito que el usuario CAMBIÓ: omitido, el
        // PUT conserva lo guardado. La fila del listado con la que se hidrató
        // el formulario puede llevar minutos en caché, y reenviarla revertiría
        // un cambio de crédito hecho por otro usuario.
        const changedCredit: CreditPayload = {};
        if (includeCredit && credit.dias_credito !== customerToEdit.dias_credito) {
          changedCredit.dias_credito = credit.dias_credito;
        }
        if (
          includeCredit &&
          Number(credit.limite_credito) !== Number(customerToEdit.limite_credito)
        ) {
          changedCredit.limite_credito = credit.limite_credito;
        }

        const updatePayload: CustomerCreate = {
          empresa: customerToEdit.empresa ?? selectedCompany.id,
          ...rest,
          ...changedCredit,
        };

        let updatedCustomer: Customer;
        try {
          updatedCustomer = await updateCustomer({
            id: Number(customerToEdit.id),
            ...updatePayload,
          });
        } catch {
          // `useUpdateCustomer` ya avisó (toast + errores por campo).
          return;
        }

        if (!updatedCustomer) {
          return;
        }

        onCreated?.(updatedCustomer);
        onSuccess?.();
        return;
      }

      const createPayload: CustomerCreate = {
        empresa: selectedCompany.id,
        ...rest,
        ...(includeCredit ? credit : {}),
      };

      let createdCustomer: Customer;
      try {
        createdCustomer = await createCustomer(createPayload);
      } catch {
        // `useCreateCustomer` ya avisó (toast + errores por campo).
        return;
      }

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

  // Error de un campo según su schema Zod y, para el CP, según el RFC que el
  // formulario tiene en ese momento.
  const getFieldMessage = (
    field: CustomerFormField,
    value: CustomerFormValues[CustomerFormField]
  ): string | null => {
    const parsed = CustomerFormFields[field].safeParse(value);
    if (!parsed.success) {
      return parsed.error.issues[0]?.message ?? "Valor inválido";
    }
    if (field === "codigo_postal") {
      return getCustomerCodigoPostalError({ ...form.state.values, codigo_postal: String(value) });
    }
    return null;
  };

  // Validación por campo (onBlur).
  const validateField = (field: CustomerFormField, value: CustomerFormValues[CustomerFormField]) => {
    const message = getFieldMessage(field, value);
    if (!message) {
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
    setClientErrors((prev) => ({ ...prev, [field]: message }));
    return false;
  };

  // Cambiar el RFC puede volver válido (o inválido) el CP ya capturado: se
  // revalida con el RFC nuevo. Un CP vacío se deja en paz para no adelantar el
  // "Requerido" a quien aún no llega a ese campo.
  const revalidateCodigoPostal = () => {
    const codigoPostal = form.state.values.codigo_postal;
    if (!codigoPostal) {
      return;
    }
    clearFieldErrors("codigo_postal");
    validateField("codigo_postal", codigoPostal);
  };

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
    revalidateCodigoPostal,
    handleReset,
    handleTextChange,
    handleNumberChange,
    handleFieldBlur,
    handleFormSubmit,
  };
}
