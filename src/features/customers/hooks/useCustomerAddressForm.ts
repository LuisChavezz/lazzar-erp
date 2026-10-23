"use client";

import { useMemo, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { getCodigoPostalError } from "@/src/utils/codigoPostal";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import {
  CustomerAddressFormSchema,
  CustomerAddressFormValues,
} from "../schemas/customer-address.schema";
import { useCreateCustomerAddress } from "./useCreateCustomerAddress";
import { useUpdateCustomerAddress } from "./useUpdateCustomerAddress";
import { CustomerAddress } from "../interfaces/customer-address.interface";

type AddressFormField = keyof CustomerAddressFormValues;

interface UseCustomerAddressFormParams {
  customerId: number;
  /**
   * RFC GUARDADO del cliente: el backend decide con él si el CP de la dirección
   * debe tener 5 dígitos (el extranjero, `XEXX010101000`, queda exento).
   */
  customerRfc: string;
  /** Direccion a editar. Si se provee, el formulario opera en modo edicion. */
  addressToEdit?: CustomerAddress | null;
  onSuccess?: () => void;
}

// Valores vacios del formulario para modo creacion.
const emptyValues: CustomerAddressFormValues = {
  destinatario: "",
  empresa_envio: "",
  telefono_envio: "",
  celular_envio: "",
  direccion_envio: "",
  colonia_envio: "",
  codigo_postal: "",
  ciudad_envio: "",
  estado_envio: "",
  referencias: "",
  is_default: false,
};

export function useCustomerAddressForm({
  customerId,
  customerRfc,
  addressToEdit,
  onSuccess,
}: UseCustomerAddressFormParams) {
  const formRef = useRef<HTMLFormElement>(null);

  const [clientErrors, setClientErrors] = useState<
    Partial<Record<AddressFormField, string>>
  >({});
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<AddressFormField, string>>
  >({});

  // Errores de campo que devuelve el backend, bajo su input (como en el cliente).
  const setHookError = (field: AddressFormField, error: { message?: string }) => {
    if (!error?.message) return;
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createAddress, isPending: isCreating } = useCreateCustomerAddress(setHookError);
  const { mutateAsync: updateAddress, isPending: isUpdating } = useUpdateCustomerAddress(setHookError);
  const isPending = isCreating || isUpdating;

  // Valores iniciales: datos de la direccion en modo edicion, vacios en modo creacion.
  const initialValues = useMemo<CustomerAddressFormValues>(() => {
    if (!addressToEdit) return emptyValues;
    return {
      destinatario: addressToEdit.destinatario,
      empresa_envio: addressToEdit.empresa_envio,
      telefono_envio: addressToEdit.telefono_envio,
      celular_envio: addressToEdit.celular_envio,
      direccion_envio: addressToEdit.direccion_envio,
      colonia_envio: addressToEdit.colonia_envio,
      codigo_postal: addressToEdit.codigo_postal,
      ciudad_envio: addressToEdit.ciudad_envio,
      estado_envio: addressToEdit.estado_envio,
      referencias: addressToEdit.referencias ?? "",
      is_default: addressToEdit.is_default ?? false,
    };
  }, [addressToEdit]);

  // Instancia del formulario TanStack Form.
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});
      const parsed = CustomerAddressFormSchema.safeParse(value);
      const nextErrors: Partial<Record<AddressFormField, string>> = {};
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as AddressFormField;
          if (field && !nextErrors[field]) {
            nextErrors[field] = issue.message;
          }
        }
      }
      const codigoPostalError = getCodigoPostalError(value.codigo_postal, customerRfc);
      if (codigoPostalError && !nextErrors.codigo_postal) {
        nextErrors.codigo_postal = codigoPostalError;
      }

      if (!parsed.success || Object.keys(nextErrors).length > 0) {
        setClientErrors(nextErrors);
        scrollToFirstValidationError(formRef.current, Object.keys(nextErrors));
        return;
      }

      // Sin `empresa`: es de solo lectura y el backend la toma del cliente.
      const payload = {
        ...parsed.data,
        cliente: customerId,
      };

      try {
        if (addressToEdit?.id) {
          await updateAddress({ id: addressToEdit.id, data: payload });
        } else {
          await createAddress(payload);
        }
      } catch {
        // El hook de la mutación ya avisó (toast + errores por campo).
        return;
      }

      form.reset();
      setClientErrors({});
      setServerErrors({});
      onSuccess?.();
    },
  });

  // Obtiene el error combinado (cliente + servidor) de un campo.
  // El del servidor gana: es el veredicto del guardado.
  const getError = (field: AddressFormField): { message?: string } | undefined => {
    const msg = serverErrors[field] ?? clientErrors[field];
    if (!msg) return undefined;
    return { message: msg };
  };

  const clearClientError = (field: AddressFormField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Limpia los errores (cliente y servidor) de un campo al editarlo.
  const clearFieldError = (field: AddressFormField) => {
    clearClientError(field);
    setServerErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Valida un campo individual con Zod al perder el foco.
  const validateField = (
    field: AddressFormField,
    value: CustomerAddressFormValues[AddressFormField]
  ) => {
    const fieldSchema = CustomerAddressFormSchema.shape[field];
    const parsed = fieldSchema.safeParse(value);
    let message: string | null = null;
    if (!parsed.success) {
      message = parsed.error.issues[0]?.message ?? "Valor invalido";
    } else if (field === "codigo_postal") {
      message = getCodigoPostalError(String(value), customerRfc);
    }
    if (!message) {
      // Solo el error local: el del servidor se va cuando se edita el campo.
      clearClientError(field);
      return true;
    }
    setClientErrors((prev) => ({ ...prev, [field]: message }));
    return false;
  };

  // Restablece el formulario: vuelve a initialValues (datos originales en edicion, vacio en creacion).
  const handleReset = () => {
    form.reset();
    setClientErrors({});
    setServerErrors({});
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    formRef,
    isPending,
    isEditing: Boolean(addressToEdit?.id),
    getError,
    clearFieldError,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
