"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useWmsOutputStore } from "../stores/wms-output.store";
import {
  WmsOutputItemSchema,
  WmsOutputSchema,
  type WmsOutputFormValues,
} from "../schemas/wms-output.schema";
import type { WmsOutputItem } from "../interfaces/wms-output.interface";

type WmsOutputField = keyof WmsOutputFormValues;

const movimientoOptions: { value: string; label: string }[] = [
  { value: "Compra", label: "Compra" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Devolución", label: "Devolución" },
  { value: "Ajuste", label: "Ajuste" },
];

export function useWmsOutputForm() {
  // Conecta operaciones del store y estado de sesión para completar usuario automáticamente.
  const addOutput = useWmsOutputStore((state) => state.addOutput);
  const { data: session } = useSession();
  const userName = session?.user?.name || "Usuario";

  // Mantiene estado de UI del diálogo, mensajes de submit e items agregados.
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [items, setItems] = useState<WmsOutputItem[]>([]);

  // Mantiene errores por campo para mostrarlos en FormInput/FormSelect.
  const [errors, setErrors] = useState<Partial<Record<WmsOutputField, string>>>({});

  // Controla estado de submit para deshabilitar controles y prevenir doble envío.
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Define valores iniciales del formulario preservando el flujo actual del módulo.
  const defaultValues = useMemo<WmsOutputFormValues>(
    () => ({
      tipoMovimiento: "Compra",
      fecha: "",
      referencia: "",
      destino: "",
      usuario: userName,
      items: [],
    }),
    [userName]
  );

  // Expone errores por campo con el contrato esperado por los componentes base.
  const getError = (field: WmsOutputField): FormFieldError | undefined => {
    const message = errors[field];
    return message ? { message } : undefined;
  };

  // Limpia error puntual cuando el usuario corrige el valor del campo.
  const clearFieldError = (field: WmsOutputField) => {
    setErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Ejecuta validación completa con Zod y proyecta mensajes por campo.
  const validateForm = (values: WmsOutputFormValues) => {
    const parsed = WmsOutputSchema.safeParse({
      ...values,
      usuario: userName,
      items,
    });

    if (parsed.success) {
      setErrors({});
      setSubmitError(null);
      return { isValid: true, data: parsed.data };
    }

    const nextErrors: Partial<Record<WmsOutputField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as WmsOutputField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });
    setErrors(nextErrors);
    setSubmitError("Completa los campos requeridos.");
    return { isValid: false as const };
  };

  // Configura TanStack Form y centraliza flujo de envío exitoso.
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const validation = validateForm(value);
      if (!validation.isValid) {
        return;
      }

      addOutput(validation.data);
      toast.success("Salida registrada correctamente");
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

  // Agrega un item validado y sincroniza el arreglo de items dentro del form.
  const handleAddItem = (item: WmsOutputItem) => {
    const parsed = WmsOutputItemSchema.safeParse(item);
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

  // Remueve un item y mantiene sincronizado el valor de items en el form.
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

  // Estado de bloqueo visual final del formulario y botón principal.
  const isPending = isSubmittingForm || form.state.isSubmitting;

  // Contrato público del hook para mantener componente de vista limpio.
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
