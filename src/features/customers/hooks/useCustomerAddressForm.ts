"use client";

import { useMemo, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import {
  CustomerAddressFormSchema,
  CustomerAddressFormValues,
} from "../schemas/customer-address.schema";
import { useCreateCustomerAddress } from "./useCreateCustomerAddress";
import { useUpdateCustomerAddress } from "./useUpdateCustomerAddress";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { CustomerAddress } from "../interfaces/customer-address.interface";

type AddressFormField = keyof CustomerAddressFormValues;

interface UseCustomerAddressFormParams {
  customerId: number;
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
  addressToEdit,
  onSuccess,
}: UseCustomerAddressFormParams) {
  const formRef = useRef<HTMLFormElement>(null);
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);

  const [clientErrors, setClientErrors] = useState<
    Partial<Record<AddressFormField, string>>
  >({});

  const { mutateAsync: createAddress, isPending: isCreating } = useCreateCustomerAddress();
  const { mutateAsync: updateAddress, isPending: isUpdating } = useUpdateCustomerAddress();
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
      const parsed = CustomerAddressFormSchema.safeParse(value);

      if (!parsed.success) {
        const nextErrors: Partial<Record<AddressFormField, string>> = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as AddressFormField;
          if (field && !nextErrors[field]) {
            nextErrors[field] = issue.message;
          }
        }
        setClientErrors(nextErrors);

        const firstInvalidField = Object.keys(nextErrors)[0];
        if (firstInvalidField && formRef.current) {
          const el = formRef.current.querySelector<HTMLInputElement>(
            `[name="${firstInvalidField}"]`
          );
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.focus({ preventScroll: true });
          }
        }
        return;
      }

      if (!selectedCompany?.id) {
        toast.error("No se encontro la empresa activa");
        return;
      }

      const payload = {
        ...parsed.data,
        cliente: customerId,
        empresa: selectedCompany.id as number,
      };

      if (addressToEdit?.id) {
        await updateAddress({ id: addressToEdit.id, data: payload });
      } else {
        await createAddress(payload);
      }

      form.reset();
      setClientErrors({});
      onSuccess?.();
    },
  });

  // Obtiene el error combinado (cliente + servidor) de un campo.
  const getError = (field: AddressFormField): { message?: string } | undefined => {
    const msg = clientErrors[field];
    if (!msg) return undefined;
    return { message: msg };
  };

  // Limpia errores locales de un campo especifico al enfocar/editar.
  const clearFieldError = (field: AddressFormField) => {
    setClientErrors((prev) => {
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
    if (parsed.success) {
      clearFieldError(field);
      return true;
    }
    const message = parsed.error.issues[0]?.message ?? "Valor invalido";
    setClientErrors((prev) => ({ ...prev, [field]: message }));
    return false;
  };

  // Restablece el formulario: vuelve a initialValues (datos originales en edicion, vacio en creacion).
  const handleReset = () => {
    form.reset();
    setClientErrors({});
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
