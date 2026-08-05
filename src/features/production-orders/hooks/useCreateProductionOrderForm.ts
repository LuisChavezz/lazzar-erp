"use client";

import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { useUnitsOfMeasure } from "@/src/features/units-of-measure/hooks/useUnitsOfMeasure";
import { useCreateProductionOrder } from "@/src/features/production-orders/hooks/useCreateProductionOrder";
import {
  CreateProductionOrderFormSchema,
  type CreateProductionOrderFormValues,
} from "@/src/features/production-orders/schemas/create-production-order.schema";

interface UseCreateProductionOrderFormParams {
  /** Prioridad seleccionada en el Paso 1. */
  prioridad: number;
  /** Observaciones generales capturadas en el Paso 1. */
  observaciones: string;
  /** Variantes seleccionadas en el Paso 1 — siembran el detalle por defecto. */
  selectedVariantIds: number[];
  /** Called after the orden de producción is created successfully. */
  onSuccess: () => void;
}

/**
 * Clave de la unidad de medida fija para toda orden de producción ("pz —
 * Pieza"). El detalle siempre se crea en piezas: el campo no es configurable
 * desde el asistente, por lo que el id se resuelve del catálogo
 * (`/nucleo/unidades-medida/`) buscando esta clave.
 */
const UNIDAD_PIEZA_CLAVE = "pz";

/** Localiza el id de "pz — Pieza" en el catálogo de unidades de medida. */
function findUnidadPiezaId(
  units: { id: number; clave: string; nombre: string }[],
): number {
  const match = units.find(
    (unit) => unit.clave.trim().toLowerCase() === UNIDAD_PIEZA_CLAVE,
  );
  return match?.id ?? 0;
}

/** Construye un renglón de detalle por defecto para una variante seleccionada. */
function buildDetalle(
  producto_variante_id: number,
  unidad: number,
): CreateProductionOrderFormValues["orden_produccion_detalle"][number] {
  return {
    producto_variante_id,
    cantidad: 1,
    unidad, // siempre "pz — Pieza"; el schema exige una unidad > 0
    observaciones: "",
  };
}

/**
 * useCreateProductionOrderForm
 *
 * Encapsula la lógica de TanStack Form para crear una orden de producción.
 * Sigue la convención del proyecto (ver `useCreateBomForm`): `useForm` con
 * `defaultValues` y validación Zod manual vía `safeParse` en el submit, más
 * los helpers `getError` / `clearError` (indexados por ruta de issue,
 * p. ej. `orden_produccion_detalle.0.unidad`) que consumen los primitivos de
 * formulario compartidos en el Paso 2.
 *
 * `empresa` / `sucursal` provienen del workspace activo; `estatus_op` viaja
 * fijo en `1`. La cabecera (prioridad, observaciones) y el detalle por variante
 * los inyecta el step manager al avanzar desde el Paso 1
 * (`setFieldValue` / {@link seedDetalle}).
 */
export function useCreateProductionOrderForm({
  prioridad,
  observaciones,
  selectedVariantIds,
  onSuccess,
}: UseCreateProductionOrderFormParams) {
  // Empresa y sucursal activas — mismo patrón que el resto de formularios.
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const selectedBranch = useWorkspaceStore((state) => state.selectedBranch);

  const { mutateAsync: createProductionOrder, isPending } =
    useCreateProductionOrder();

  // Unidad de medida fija del detalle — no se captura en el asistente.
  const { units, isLoading: isLoadingUnits } = useUnitsOfMeasure();
  const unidadPiezaId = findUnidadPiezaId(units);

  // Errores de validación cliente, indexados por ruta ("a.0.b").
  const [errors, setErrors] = useState<Record<string, string>>({});

  const form = useForm({
    defaultValues: {
      empresa: selectedCompany.id ?? 0,
      sucursal: selectedBranch?.id ?? 0,
      estatus_op: 1,
      prioridad,
      observaciones,
      orden_produccion_detalle: selectedVariantIds.map((id) =>
        buildDetalle(id, unidadPiezaId),
      ),
    } as CreateProductionOrderFormValues,
    onSubmit: async ({ value }) => {
      const parsed = CreateProductionOrderFormSchema.safeParse(value);

      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) {
            nextErrors[key] = issue.message;
          }
        });
        setErrors(nextErrors);

        // `empresa` / `sucursal` no tienen campo visible en el Paso 2 (vienen
        // del workspace): si fallan, avísalo por toast para no dejar al usuario
        // sin feedback al confirmar.
        const headerError = nextErrors["empresa"] ?? nextErrors["sucursal"];
        if (headerError) {
          toast.error(headerError);
        }
        return;
      }

      setErrors({});

      try {
        await createProductionOrder(parsed.data);
        onSuccess();
      } catch {
        // El toast de error lo maneja la mutación.
      }
    },
  });

  /** Siembra `orden_produccion_detalle` a partir de las variantes elegidas. */
  const seedDetalle = (ids: number[]) => {
    form.setFieldValue(
      "orden_produccion_detalle",
      ids.map((id) => buildDetalle(id, unidadPiezaId)),
    );
  };

  // Si el detalle se sembró antes de que llegara el catálogo, refresca la
  // unidad de todos los renglones en cuanto se resuelve el id de "pz — Pieza".
  useEffect(() => {
    if (unidadPiezaId === 0) return;
    const detalle = form.getFieldValue("orden_produccion_detalle");
    if (!detalle?.length) return;
    if (detalle.every((item) => item.unidad === unidadPiezaId)) return;
    form.setFieldValue(
      "orden_produccion_detalle",
      detalle.map((item) => ({ ...item, unidad: unidadPiezaId })),
    );
  }, [form, unidadPiezaId]);

  // Entrega el error de un campo (por ruta) en el shape que esperan los
  // primitivos de formulario compartidos.
  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  // Limpia el error de un campo cuando su valor cambia.
  const clearError = (path: string) => {
    setErrors((prev) => {
      if (!(path in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  return {
    form,
    isSubmitting: isPending,
    getError,
    clearError,
    seedDetalle,
    /** El catálogo de unidades aún no llega: el detalle no tiene unidad válida. */
    isLoadingUnits,
    /** El catálogo no contiene "pz — Pieza": no se puede armar el detalle. */
    isUnidadPiezaMissing: !isLoadingUnits && unidadPiezaId === 0,
  };
}

/** Tipo de la instancia de TanStack Form expuesta por el hook. */
export type CreateProductionOrderFormApi = ReturnType<
  typeof useCreateProductionOrderForm
>["form"];
