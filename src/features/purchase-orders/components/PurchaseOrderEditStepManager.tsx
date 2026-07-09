"use client";

/**
 * PurchaseOrderEditStepManager
 *
 * ── Decisión arquitectónica: Opción B (flujo de edición separado) ──────────
 *
 * Se optó por un flujo de edición DEDICADO en lugar de extender el wizard de
 * creación con un prop `mode`, porque las semánticas del API divergen:
 *
 *   • Creación (onboarding): 2 POST secuenciales (encabezados → detalles),
 *       ambos dentro del Step 2. La confirmación (`aceptar`) ya no vive aquí:
 *       ocurre después, desde la acción "Confirmar" del listado.
 *   • Edición: un `PUT /compras/ordenes/{pk}/` con encabezado + `detalles`
 *       (`UpdatePurchaseOrderBody`), reflejando la forma del alta.
 *
 * El wizard de edición tiene 2 pasos que reflejan los del alta:
 *   1. Datos generales (encabezado)
 *   2. Agregar productos — pre-poblado con los renglones existentes de la orden
 *      (cada `detalle` expone `producto_id`, obtenido vía GET de la orden) y,
 *      al guardar, arma el body (encabezado + `detalles`) y envía el PUT.
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
import {
  PURCHASE_ORDER_WIZARD_STEPS as STEPS,
  PURCHASE_ORDER_WIZARD_STEP_LABELS as STEP_LABELS,
  type PurchaseOrderWizardStep as EditStep,
} from "../constants/purchaseOrderWizardSteps";
import { usePurchaseOrderOnboardingData } from "../hooks/usePurchaseOrderOnboardingData";
import { usePurchaseOrder } from "../hooks/usePurchaseOrder";
import { PurchaseOrderEditStep1 } from "./PurchaseOrderEditStep1";
import { PurchaseOrderEditStep2 } from "./PurchaseOrderEditStep2";

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

  /** Step 2 guardó (PUT) exitosamente — paso final del wizard. */
  const handleStep2Success = () => onClose?.();

  // Renglones iniciales del paso de productos: sembrados desde los renglones
  // existentes de la orden, conservando `precio` y `descripcion` reales (no
  // solo la cantidad).
  const initialItems = useMemo<PurchaseOrderDetalleItem[]>(
    () =>
      (detail?.detalles ?? []).map((d) => ({
        producto: d.producto_id,
        cantidad: d.cantidad,
        precio: d.precio,
        descripcion: d.descripcion,
      })),
    [detail],
  );

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
        {currentStep === "step-2" && header !== null && (
          <PurchaseOrderEditStep2
            initialData={initialData}
            header={header}
            onboardingData={onboardingData}
            initialItems={initialItems}
            onSuccess={handleStep2Success}
            onBack={() => setCurrentStep("step-1")}
          />
        )}
      </div>
    </div>
  );
}
