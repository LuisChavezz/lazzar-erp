"use client";

import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";
import { useLocations } from "@/src/features/locations/hooks/useLocations";
import { useProductSelectorTotal } from "@/src/features/products/hooks/useProductSelector";
import { useProductVariantSelectorTotal } from "@/src/features/product-variants/hooks/useProductVariantSelector";
import type { ProductSelectorItem } from "@/src/features/products/interfaces/product-selector.interface";
import type { ProductVariantSelectorItem } from "@/src/features/product-variants/interfaces/product-variant-selector.interface";
import {
  StockTransferFormSchema,
  createEmptyTransferLine,
  type ItemKind,
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
  /**
   * Variante de origen (solo en las opciones de variante): el selector muestra
   * sus códigos secundarios (Proscai, SKU de producción), igual que
   * Movimientos y Nueva OP.
   */
  variant?: ProductVariantSelectorItem;
}

/** Fila del selector de productos como opción de una línea. */
export const productEntityOption = (product: ProductSelectorItem): EntityOption => ({
  id: product.id,
  label: product.nombre,
  sublabel: product.codigo ?? undefined,
});

/** Fila del selector de variantes como opción de una línea. */
export const variantEntityOption = (variant: ProductVariantSelectorItem): EntityOption => ({
  id: variant.id,
  label: `${variant.sku} - ${variant.nombre}`,
  sublabel: variant.sku,
  variant,
});

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
    isInitialError: isErrorWarehouses,
  } = useWarehouses();
  const {
    data: locations = [],
    isLoading: isLoadingLocations,
    isInitialError: isErrorLocations,
  } = useLocations();
  // Productos y variantes se buscan en el servidor desde el selector de cada
  // línea (`StockTransferProductSelectorDialog`, selectores ligeros de activos,
  // EC-886): aquí no se descargan los catálogos. Solo se pregunta si hay
  // alguno de cada uno (una fila), para el aviso de prerrequisitos.
  const {
    total: productTotal,
    isLoading: isLoadingProducts,
    isInitialError: isErrorProducts,
  } = useProductSelectorTotal();
  const {
    total: variantTotal,
    isLoading: isLoadingVariants,
    isInitialError: isErrorVariants,
  } = useProductVariantSelectorTotal();

  const isLoadingFormData =
    isLoadingWarehouses || isLoadingLocations || isLoadingProducts || isLoadingVariants;
  // Si un catálogo NUNCA cargó, no se puede armar el formulario con selects
  // válidos: se expone para que el diálogo muestre un estado de error explícito
  // en vez de la pantalla de "faltan configuraciones" (una lista vacía por error
  // de red se confundiría con un catálogo legítimamente vacío). Cada catálogo
  // se juzga por SU carga inicial (los cuatro hooks exponen `isInitialError`):
  // un refetch fallido de cualquiera conserva el formulario —y lo ya
  // capturado— y avisa por toast desde su hook.
  const isErrorFormData =
    isErrorWarehouses || isErrorLocations || isErrorProducts || isErrorVariants;

  // ─── Estado de UI ─────────────────────────────────────────────────────────
  // Errores indexados por ruta ("almacen_destino", "transferencia_detalle.0.cantidad").
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Banner de "todo o nada" cuando el backend rechaza la operación completa.
  const [serverBanner, setServerBanner] = useState<string | null>(null);
  // Se incrementa en cada rechazo del backend (incluso si el mensaje es idéntico
  // al anterior), para que la UI pueda disparar el scroll-to-top del diálogo en
  // CADA intento fallido, no solo cuando `serverBanner` cambia de valor.
  const [bannerErrorTick, setBannerErrorTick] = useState(0);
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

  // Lo elegido en cada selector, por modo e id: la línea solo guarda el id, y
  // la etiqueta (y la opción fija al reabrir el selector) sale de aquí, no de
  // un catálogo cargado. Se vacía junto con el formulario (al limpiar y tras
  // un traspaso registrado): describe las líneas, no las sobrevive.
  const [knownItems, setKnownItems] = useState<Record<string, EntityOption>>({});
  const rememberItem = (mode: ItemKind, option: EntityOption) =>
    setKnownItems((prev) => ({ ...prev, [`${mode}:${option.id}`]: option }));
  const getItemOption = (mode: ItemKind, id: number): EntityOption | undefined =>
    id > 0 ? knownItems[`${mode}:${id}`] : undefined;

  // ─── Prerrequisitos ───────────────────────────────────────────────────────
  const missingItems = useMemo(() => {
    const items: string[] = [];
    // Un traspaso necesita origen Y destino distintos → al menos 2 almacenes.
    if (warehouseOptions.length < 2) items.push("Al menos 2 almacenes activos");
    if (productTotal === 0 && variantTotal === 0) {
      items.push("Productos o variantes de producto");
    }
    return items;
  }, [warehouseOptions.length, productTotal, variantTotal]);

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
    setBannerErrorTick((tick) => tick + 1);
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
        setKnownItems({});
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
    setKnownItems({});
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
    rememberItem,
    getItemOption,
    lineKeys,
    serverBanner,
    bannerErrorTick,
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
