"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useProducts } from "@/src/features/products/hooks/useProducts";
import { useLocations } from "@/src/features/locations/hooks/useLocations";
import type { WmsAdjustmentReason } from "../interfaces/wms-adjustment.interface";
import { WmsAdjustmentSchema, type WmsAdjustmentFormValues } from "../schemas/wms-adjustment.schema";
import { useWmsAdjustmentStore } from "../stores/wms-adjustment.store";

type WmsAdjustmentField = keyof WmsAdjustmentFormValues;

const motivoOptions: { value: WmsAdjustmentReason; label: string }[] = [
  { value: "Conteo físico", label: "Conteo físico" },
  { value: "Merma", label: "Merma" },
  { value: "Error sistema", label: "Error sistema" },
  { value: "Producto dañado", label: "Producto dañado" },
];

export function useWmsAdjustmentForm() {
  // Fuentes de datos para catálogos del formulario y operación de persistencia.
  const addAdjustment = useWmsAdjustmentStore((state) => state.addAdjustment);
  const { data: session } = useSession();
  const { products = [], isLoading: productsLoading } = useProducts();
  const { data: locations = [], isLoading: locationsLoading } = useLocations();

  // Estado de carga global para mantener el mismo comportamiento de bloqueo visual.
  const isLoadingFormData = productsLoading || locationsLoading;
  const userName = session?.user?.name || "Usuario";

  // Opciones de producto derivadas por nombre único.
  const productoOptions = useMemo(() => {
    if (products.length > 0) {
      return Array.from(new Set(products.map((product) => product.nombre))).map((producto) => ({
        value: producto,
        label: producto,
      }));
    }
    return [];
  }, [products]);

  // Opciones de ubicación filtrando solo ubicaciones activas.
  const ubicacionOptions = useMemo(
    () =>
      locations
        .filter((location) => location.estatus === "ACTIVO")
        .map((location) => ({
          value: String(location.id_ubicacion),
          label: `Ubicación ${location.id_ubicacion} · P${location.pasillo} · R${location.rack}`,
        })),
    [locations]
  );

  // Lista de prerrequisitos para bloquear el formulario cuando faltan datos base.
  const missingItems = useMemo(() => {
    const items: string[] = [];
    if (products.length === 0) {
      items.push("Productos");
    }
    if (ubicacionOptions.length === 0) {
      items.push("Ubicaciones activas");
    }
    return items;
  }, [products.length, ubicacionOptions.length]);

  // Valores iniciales que conservan el flujo original del formulario.
  const defaultProducto = productoOptions[0]?.value ?? "";
  const defaultUbicacion = ubicacionOptions[0]?.value ?? "";
  const defaultCantidadActual = 0;
  const defaultValues: WmsAdjustmentFormValues = {
    producto: defaultProducto,
    ubicacion: defaultUbicacion,
    cantidadActual: defaultCantidadActual,
    cantidadCorrecta: defaultCantidadActual,
    motivo: "Conteo físico",
  };

  // Estado auxiliar de UI para la vista de cantidad actual de solo lectura.
  const [cantidadActualView, setCantidadActualView] = useState(defaultCantidadActual);

  // Errores de validación por campo adaptados al contrato de los inputs del proyecto.
  const [errors, setErrors] = useState<Partial<Record<WmsAdjustmentField, string>>>({});

  // Traduce errores internos a la estructura esperada por FormInput/FormSelect.
  const getError = (field: WmsAdjustmentField): FormFieldError | undefined => {
    const message = errors[field];
    return message ? { message } : undefined;
  };

  // Limpia un error puntual cuando el usuario corrige el campo correspondiente.
  const clearFieldError = (field: WmsAdjustmentField) => {
    setErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Ejecuta validación completa con Zod y genera un mapa de errores por campo.
  const validateForm = (values: WmsAdjustmentFormValues) => {
    const parsed = WmsAdjustmentSchema.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return true;
    }

    const nextErrors: Partial<Record<WmsAdjustmentField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as WmsAdjustmentField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setErrors(nextErrors);
    return false;
  };

  // Núcleo de TanStack Form: valida, guarda ajuste y restablece estado del formulario.
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (!validateForm(value)) {
        return;
      }

      addAdjustment({
        ...value,
        usuario: userName,
      });
      toast.success("Ajuste guardado correctamente");
      form.reset(defaultValues);
      setErrors({});
      setCantidadActualView(defaultCantidadActual);
    },
  });

  // Replica comportamiento original al cambiar producto: reinicia cantidad actual en estado y UI.
  const handleProductoChange = (nextValue: string) => {
    clearFieldError("producto");
    if (!nextValue) {
      return;
    }
    form.setFieldValue("cantidadActual", 0);
    clearFieldError("cantidadActual");
    setCantidadActualView(0);
  };

  // Replica comportamiento original al cambiar ubicación: reinicia cantidad actual en estado y UI.
  const handleUbicacionChange = (nextValue: string) => {
    clearFieldError("ubicacion");
    if (!nextValue) {
      return;
    }
    form.setFieldValue("cantidadActual", 0);
    clearFieldError("cantidadActual");
    setCantidadActualView(0);
  };

  // Encapsula submit DOM para delegar en TanStack y evitar doble envío.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await Promise.resolve(form.handleSubmit());
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estado de bloqueo visual del botón submit.
  const isPending = isSubmitting || form.state.isSubmitting;

  // Contrato público del hook para mantener el componente de vista desacoplado de la lógica.
  return {
    form,
    isLoadingFormData,
    missingItems,
    isPending,
    productoOptions,
    ubicacionOptions,
    motivoOptions,
    cantidadActualView,
    getError,
    clearFieldError,
    handleFormSubmit,
    handleProductoChange,
    handleUbicacionChange,
  };
}
