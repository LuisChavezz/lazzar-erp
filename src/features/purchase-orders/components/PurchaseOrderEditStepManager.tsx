"use client";

/**
 * PurchaseOrderEditStepManager
 *
 * ── Decisión arquitectónica: Opción B (flujo de edición separado) ──────────
 *
 * Se optó por un flujo de edición DEDICADO en lugar de extender el wizard de
 * creación con un prop `mode`, porque las semánticas del API divergen:
 *
 *   • Creación (onboarding): 3 POST secuenciales (encabezados → detalles →
 *       aceptar). El alta real ocurre en el Step 2 y el Step 3 ACEPTA la orden.
 *   • Edición: un `PUT /compras/ordenes/{pk}/` con encabezado + `detalles`
 *       (`UpdatePurchaseOrderBody`), reflejando la forma del alta.
 *
 * El wizard de edición tiene 3 pasos que reflejan los del alta:
 *   1. Datos generales (encabezado)
 *   2. Agregar productos — pre-poblado con los renglones existentes de la orden
 *      (cada `detalle` expone `producto_id`, obtenido vía GET de la orden).
 *   3. Revisión y confirmación — arma el body (encabezado + `detalles`) y lo
 *      envía en el PUT.
 *
 * Reutilizar el wizard de creación habría requerido condicionales de `mode`
 * invasivos en pasos cuya semántica difiere por completo.
 *
 * Las primitivas compartidas (StepProgressBar, formularios) sí se reutilizan.
 */

import { useCallback, useMemo, useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import type { PurchaseOrderDetalleItem } from "../interfaces/purchase-order-onboarding.interface";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import type { PurchaseOrderEditFormValues } from "../schemas/purchase-order-edit.schema";
import { usePurchaseOrderOnboardingData } from "../hooks/usePurchaseOrderOnboardingData";
import { usePurchaseOrder } from "../hooks/usePurchaseOrder";
import { PurchaseOrderEditStep1 } from "./PurchaseOrderEditStep1";
import { PurchaseOrderEditStep2 } from "./PurchaseOrderEditStep2";
import { PurchaseOrderEditStep3 } from "./PurchaseOrderEditStep3";

/** Pasos del flujo de edición. */
type EditStep = "step-1" | "step-2" | "step-3";

const STEPS: readonly EditStep[] = ["step-1", "step-2", "step-3"];

const STEP_LABELS: Record<EditStep, string> = {
  "step-1": "Datos generales",
  "step-2": "Agregar productos",
  "step-3": "Revisión y confirmación",
};

interface PurchaseOrderEditStepManagerProps {
  /** Orden a editar. */
  initialData: PurchaseOrder;
  /** Cierra el diálogo (tras guardar o al cancelar). */
  onClose?: () => void;
}

export function PurchaseOrderEditStepManager({
  initialData,
  onClose,
}: PurchaseOrderEditStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<EditStep>(STEPS[0]);
  const [header, setHeader] = useState<PurchaseOrderEditFormValues | null>(null);
  const [items, setItems] = useState<PurchaseOrderDetalleItem[] | null>(null);

  // Catálogos (sucursales, monedas, proveedores, productos) para los pasos.
  const {
    onboardingData,
    isLoading: isOnboardingLoading,
    isError: isOnboardingError,
    error: onboardingError,
  } = usePurchaseOrderOnboardingData();

  // Detalle de la orden — aporta los renglones existentes (con `producto_id`)
  // para sembrar el paso de productos.
  const {
    purchaseOrder: detail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError,
  } = usePurchaseOrder(initialData.id);

  /** Step 1 validó el encabezado: lo guardamos y avanzamos a productos. */
  const handleStep1Success = useCallback(
    (nextHeader: PurchaseOrderEditFormValues) => {
      setHeader(nextHeader);
      setCurrentStep("step-2");
    },
    [],
  );

  /** Step 2 capturó los productos: los guardamos y avanzamos a la revisión. */
  const handleStep2Success = useCallback(
    (detalle: PurchaseOrderDetalleItem[]) => {
      setItems(detalle);
      setCurrentStep("step-3");
    },
    [],
  );

  // Renglones iniciales del paso de productos: si el usuario ya capturó una
  // selección (regreso desde la revisión) se respeta; de lo contrario se siembra
  // desde los renglones existentes de la orden, conservando `precio` y
  // `descripcion` reales (no solo la cantidad) para una revisión fiel.
  const initialItems = useMemo<PurchaseOrderDetalleItem[]>(() => {
    if (items) {
      return items;
    }
    return (detail?.detalles ?? []).map((d) => ({
      producto: d.producto_id,
      cantidad: d.cantidad,
      precio: d.precio,
      descripcion: d.descripcion,
    }));
  }, [items, detail]);

  const isLoading = isOnboardingLoading || isDetailLoading;
  const isError = isOnboardingError || isDetailError;
  const error = onboardingError ?? detailError;

  // ── Carga de catálogos y detalle ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-sm text-slate-500">
          Cargando datos de la orden...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          Error al cargar los datos de la orden
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  if (!onboardingData || !detail) {
    return null;
  }

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={STEPS}
        currentStep={currentStep}
        labels={STEP_LABELS}
      />
      <div>
        {currentStep === "step-1" && (
          <PurchaseOrderEditStep1
            initialData={initialData}
            initialHeader={header ?? undefined}
            onboardingData={onboardingData}
            onSuccess={handleStep1Success}
          />
        )}
        {currentStep === "step-2" && (
          <PurchaseOrderEditStep2
            onboardingData={onboardingData}
            initialItems={initialItems}
            onSuccess={handleStep2Success}
            onBack={() => setCurrentStep("step-1")}
          />
        )}
        {currentStep === "step-3" && header !== null && items !== null && (
          <PurchaseOrderEditStep3
            initialData={initialData}
            header={header}
            items={items}
            onboardingData={onboardingData}
            onBack={() => setCurrentStep("step-2")}
            onClose={() => onClose?.()}
          />
        )}
      </div>
    </div>
  );
}
