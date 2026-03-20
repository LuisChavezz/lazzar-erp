"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useWmsEntryStore } from "../stores/wms-entry.store";
import {
  WmsEntryItemSchema,
  WmsEntrySchema,
  type WmsEntryFormValues,
} from "../schemas/wms-entry.schema";
import type { WmsEntryItem } from "../interfaces/wms-entry.interface";

type WmsEntryField = keyof WmsEntryFormValues;

const movimientoOptions: { value: string; label: string }[] = [
  { value: "Compra", label: "Compra" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Devolución", label: "Devolución" },
  { value: "Ajuste", label: "Ajuste" },
];

export function useWmsEntryForm() {
  // Conecta operaciones del store y la sesión para asignar usuario automáticamente.
  const addEntry = useWmsEntryStore((state) => state.addEntry);
  const { data: session } = useSession();
  const userName = session?.user?.name || "Usuario";

  // Mantiene estado de UI del diálogo, mensaje global e items agregados.
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [items, setItems] = useState<WmsEntryItem[]>([]);

  // Mantiene errores por campo para mapearlos a componentes de formulario.
  const [errors, setErrors] = useState<Partial<Record<WmsEntryField, string>>>({});

  // Controla estado de submit para bloquear interacción durante el envío.
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Define los valores iniciales respetando comportamiento actual del formulario.
  const defaultValues = useMemo<WmsEntryFormValues>(
    () => ({
      tipoMovimiento: "Compra",
      fecha: "",
      referencia: "",
      proveedor: "",
      usuario: userName,
      items: [],
    }),
    [userName]
  );

  // Expone el error de un campo en el formato esperado por FormInput/FormSelect.
  const getError = (field: WmsEntryField): FormFieldError | undefined => {
    const message = errors[field];
    return message ? { message } : undefined;
  };

  // Limpia error puntual cuando el usuario modifica el valor del campo.
  const clearFieldError = (field: WmsEntryField) => {
    setErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Ejecuta validación completa con Zod para mantener el mismo contrato de reglas.
  const validateForm = (values: WmsEntryFormValues) => {
    const parsed = WmsEntrySchema.safeParse({
      ...values,
      usuario: userName,
      items,
    });

    if (parsed.success) {
      setErrors({});
      setSubmitError(null);
      return { isValid: true, data: parsed.data };
    }

    const nextErrors: Partial<Record<WmsEntryField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as WmsEntryField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });
    setErrors(nextErrors);
    setSubmitError("Completa los campos requeridos.");
    return { isValid: false as const };
  };

  // Inicializa TanStack Form y centraliza flujo de guardado y limpieza.
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const validation = validateForm(value);
      if (!validation.isValid) {
        return;
      }

      addEntry(validation.data);
      toast.success("Entrada registrada correctamente");
      setItems([]);
      form.reset({
        ...defaultValues,
        usuario: userName,
        items: [],
      });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
  });

  // Agrega item validado y sincroniza la colección interna del formulario.
  const handleAddItem = (item: WmsEntryItem) => {
    const parsed = WmsEntryItemSchema.safeParse(item);
    if (!parsed.success) {
      return;
    }
    setItems((currentItems) => {
      const nextItems = [...currentItems, parsed.data];
      form.setFieldValue("items", nextItems);
      clearFieldError("items");
      setSubmitError(null);
      return nextItems;
    });
  };

  // Remueve item y mantiene la colección de items del formulario sincronizada.
  const handleRemoveItem = (index: number) => {
    setItems((currentItems) => {
      const nextItems = currentItems.filter((_, idx) => idx !== index);
      form.setFieldValue("items", nextItems);
      return nextItems;
    });
  };

  // Encapsula submit del DOM para delegarlo en TanStack Form.
  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmittingForm) {
      return;
    }
    setIsSubmittingForm(true);
    try {
      await Promise.resolve(form.handleSubmit());
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Estado final de bloqueo visual para el formulario.
  const isPending = isSubmittingForm || form.state.isSubmitting;

  // Contrato público del hook para mantener el componente de vista limpio.
  return {
    form,
    isPending,
    userName,
    items,
    submitError,
    isDialogOpen,
    movimientoOptions,
    getError,
    clearFieldError,
    setIsDialogOpen,
    handleFormSubmit,
    handleAddItem,
    handleRemoveItem,
  };
}
