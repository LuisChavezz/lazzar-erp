"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";
import { useLocations } from "@/src/features/locations/hooks/useLocations";
import { useProducts } from "@/src/features/products/hooks/useProducts";
import { useProductVariants } from "@/src/features/product-variants/hooks/useProductVariants";
import {
  StockTransferFormSchema,
  createEmptyTransferLine,
  type StockTransferFormValues,
} from "../schemas/stock-transfer.schema";
import { buildTransferPayload } from "../utils/buildTransferPayload";
import {
  useCreateStockTransfer,
  type ParsedTransferError,
} from "./useCreateStockTransfer";

/** Opción para los selectores buscables de producto / variante. */
export interface EntityOption {
  id: number;
  label: string;
  sublabel?: string;
}

const LINE_ERROR_PREFIX = "transferencia_detalle";

/**
 * Detecta la ruta de un CAMPO de una línea (`transferencia_detalle.<i>.<campo>`)
 * y captura su índice (grupo 1) y el nombre del campo (grupo 2). Sirve para
 * derivar, desde el campo que el usuario edita, la clave del error a nivel de
 * línea (`transferencia_detalle.<i>._form`) de esa misma línea.
 */
const LINE_FIELD_PATH_RE = new RegExp(`^${LINE_ERROR_PREFIX}\\.(\\d+)\\.(.+)$`);

export function useStockTransferForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  // ─── Catálogos (se cargan bajo demanda al abrir el diálogo) ───────────────
  const {
    data: warehouses = [],
    isLoading: isLoadingWarehouses,
    isError: isErrorWarehouses,
  } = useWarehouses();
  const {
    data: locations = [],
    isLoading: isLoadingLocations,
    isError: isErrorLocations,
  } = useLocations();
  const {
    products = [],
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
  } = useProducts();
  const {
    productVariants = [],
    isLoading: isLoadingVariants,
    isError: isErrorVariants,
  } = useProductVariants();

  const isLoadingFormData =
    isLoadingWarehouses || isLoadingLocations || isLoadingProducts || isLoadingVariants;
  // Si CUALQUIER catálogo falla, no se puede armar el formulario con selects
  // válidos: se expone para que el diálogo muestre un estado de error explícito
  // en vez de la pantalla de "faltan configuraciones" (una lista vacía por error
  // de red se confundiría con un catálogo legítimamente vacío). Mismo patrón que
  // `useRegisterPendingInvoiceForm` (CxC).
  const isErrorFormData =
    isErrorWarehouses || isErrorLocations || isErrorProducts || isErrorVariants;

  // ─── Estado de UI ─────────────────────────────────────────────────────────
  // Errores indexados por ruta ("almacen_destino", "transferencia_detalle.0.cantidad").
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Banner de "todo o nada" cuando el backend rechaza la operación completa.
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInFlight = useRef(false);

  // Claves estables por línea para el `key` de React — desacoplan la
  // reconciliación del índice del arreglo, evitando que al eliminar una línea
  // intermedia se reutilice el estado local de otra (ej. el input de búsqueda).
  const lineKeyCounter = useRef(1); // `0` lo usa la línea inicial.
  const [lineKeys, setLineKeys] = useState<number[]>([0]);

  // ─── Opciones derivadas ─────────────────────────────────────────────────
  const warehouseOptions = useMemo(
    () =>
      warehouses
        .filter((w) => w.estatus === "ACTIVO")
        .map((w) => ({ value: w.id_almacen, label: `${w.codigo} - ${w.nombre}` })),
    [warehouses],
  );

  /** Ubicaciones activas — se filtran por almacén en el componente. */
  const activeLocations = useMemo(
    () => locations.filter((l) => l.estatus === "ACTIVO"),
    [locations],
  );

  const productOptions = useMemo<EntityOption[]>(
    () =>
      products
        .filter((p) => p.activo)
        .map((p) => ({ id: p.id, label: p.nombre, sublabel: p.codigo })),
    [products],
  );

  const variantOptions = useMemo<EntityOption[]>(
    () =>
      productVariants
        .filter((v) => v.activo)
        .map((v) => ({ id: v.id, label: `${v.sku} - ${v.nombre}`, sublabel: v.sku })),
    [productVariants],
  );

  // ─── Prerrequisitos ───────────────────────────────────────────────────────
  const missingItems = useMemo(() => {
    const items: string[] = [];
    // Un traspaso necesita origen Y destino distintos → al menos 2 almacenes.
    if (warehouseOptions.length < 2) items.push("Al menos 2 almacenes activos");
    if (productOptions.length === 0 && variantOptions.length === 0) {
      items.push("Productos o variantes de producto");
    }
    return items;
  }, [warehouseOptions.length, productOptions.length, variantOptions.length]);

  // ─── Helpers de errores ─────────────────────────────────────────────────
  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  const clearError = (path: string) => {
    setErrors((prev) => {
      // Al limpiar el error de un CAMPO de una línea, se limpia también el error
      // a nivel de línea (`_form`) de esa misma línea: si el usuario edita
      // cualquier campo de la línea, la está corrigiendo, así que el aviso de
      // línea del backend (p. ej. "Producto duplicado en otra línea") deja de ser
      // vigente y no debe quedar "pegado" hasta el próximo submit.
      const match = LINE_FIELD_PATH_RE.exec(path);
      const lineFormKey =
        match && match[2] !== "_form"
          ? `${LINE_ERROR_PREFIX}.${match[1]}._form`
          : null;
      if (!(path in prev) && !(lineFormKey !== null && lineFormKey in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[path];
      if (lineFormKey) delete next[lineFormKey];
      return next;
    });
  };

  /** Fija el mensaje de error de una ruta concreta (p. ej. la validación en vivo
   *  del par almacén origen/destino). Idempotente: no re-renderiza si el mensaje
   *  no cambia. */
  const setFieldError = (path: string, message: string) => {
    setErrors((prev) =>
      prev[path] === message ? prev : { ...prev, [path]: message },
    );
  };

  /** Al ELIMINAR una línea intermedia los índices posteriores se recorren, así
   *  que se descartan todos los errores de línea para no atribuirlos mal (y el
   *  banner de "todo o nada"). Agregar al final NO recorre índices, por eso
   *  `addLine` no invoca esta función. */
  const resetLineErrors = () => {
    setErrors((prev) => {
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(LINE_ERROR_PREFIX)) next[key] = value;
      }
      return next;
    });
    setServerBanner(null);
  };

  // ─── Reparto del error del backend ────────────────────────────────────────
  const handleServerError = (parsed: ParsedTransferError) => {
    const next: Record<string, string> = {};

    (Object.keys(parsed.fieldErrors) as (keyof typeof parsed.fieldErrors)[]).forEach(
      (field) => {
        const message = parsed.fieldErrors[field];
        if (message) next[field] = message;
      },
    );

    Object.entries(parsed.lineErrors).forEach(([index, fields]) => {
      Object.entries(fields).forEach(([field, message]) => {
        next[`${LINE_ERROR_PREFIX}.${index}.${field}`] = message;
      });
    });

    setErrors((prev) => ({ ...prev, ...next }));

    const hasFieldOrLine =
      Object.keys(parsed.fieldErrors).length > 0 ||
      Object.keys(parsed.lineErrors).length > 0;
    const detail =
      parsed.formError ?? (hasFieldOrLine ? "Revisa los campos marcados." : "Intenta de nuevo.");
    setServerBanner(`No se realizó ningún traspaso. ${detail}`);
  };

  const { mutateAsync: createTransfer, isPending: isCreating } =
    useCreateStockTransfer(handleServerError);

  // ─── Formulario ─────────────────────────────────────────────────────────
  const defaultValues = useMemo<StockTransferFormValues>(
    () => ({
      almacen_origen: 0,
      almacen_destino: 0,
      observaciones: "",
      transferencia_detalle: [createEmptyTransferLine()],
    }),
    [],
  );

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerBanner(null);

      // Validación cliente (espejo de las reglas del backend).
      const parsed = StockTransferFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        return;
      }
      setErrors({});

      if (submitInFlight.current) return;
      submitInFlight.current = true;
      setIsSubmitting(true);

      try {
        await createTransfer(buildTransferPayload(parsed.data));
        form.reset(defaultValues);
        setLineKeys([lineKeyCounter.current++]);
        setErrors({});
        setServerBanner(null);
        onSuccess?.();
      } catch {
        // El error del backend ya se repartió en `handleServerError` (banner +
        // errores por campo/línea) y se mostró el toast desde la mutación.
      } finally {
        setIsSubmitting(false);
        submitInFlight.current = false;
      }
    },
  });

  const isPending = isSubmitting || isCreating;

  // ─── Líneas del detalle ───────────────────────────────────────────────────
  const addLine = () => {
    const key = lineKeyCounter.current++;
    form.pushFieldValue("transferencia_detalle", createEmptyTransferLine());
    setLineKeys((prev) => [...prev, key]);
    // Agregar una línea al final NO recorre los índices de las líneas ya
    // existentes, así que sus errores (y el banner de la última respuesta del
    // backend) siguen siendo válidos y se conservan a propósito — a diferencia de
    // `removeLine`, que sí debe descartarlos porque el borrado recorre índices.
  };

  const removeLine = (index: number) => {
    form.removeFieldValue("transferencia_detalle", index);
    setLineKeys((prev) => prev.filter((_, i) => i !== index));
    resetLineErrors();
  };

  // ─── Submit / reset ───────────────────────────────────────────────────────
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  const handleReset = () => {
    form.reset(defaultValues);
    setLineKeys([lineKeyCounter.current++]);
    setErrors({});
    setServerBanner(null);
  };

  return {
    form,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    warehouseOptions,
    activeLocations,
    productOptions,
    variantOptions,
    lineKeys,
    serverBanner,
    dismissBanner: () => setServerBanner(null),
    getError,
    clearError,
    setFieldError,
    addLine,
    removeLine,
    handleFormSubmit,
    handleReset,
  };
}
