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
import { useQuery } from "@tanstack/react-query";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import type { PurchaseOrderDetalleItem } from "../interfaces/purchase-order-onboarding.interface";
import type {
  PurchaseOrder,
  PurchaseOrderDetail,
} from "../interfaces/purchase-order.interface";
import type { PurchaseOrderEditFormValues } from "../schemas/purchase-order-edit.schema";
import {
  PURCHASE_ORDER_WIZARD_STEPS as STEPS,
  PURCHASE_ORDER_WIZARD_STEP_LABELS as STEP_LABELS,
  type PurchaseOrderWizardStep as EditStep,
} from "../constants/purchaseOrderWizardSteps";
import { usePurchaseOrderOnboardingData } from "../hooks/usePurchaseOrderOnboardingData";
import { purchaseOrderQueryOptions } from "../hooks/usePurchaseOrder";
import { canSeeAmounts } from "../utils/purchaseOrderFinance";
import { PURCHASE_ORDER_STATUS } from "../constants/purchaseOrderStatus";
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
  // para sembrar el paso de productos, y el `estatus` que decide el aviso de
  // "orden autorizada".
  //
  // Se lee SIEMPRE fresco al abrir (`refetchOnMount: "always"`) y el wizard no
  // se pinta hasta que esa lectura termina (`isFetchedAfterMount`): con los
  // defaults de `usePurchaseOrder` se serviría la copia en caché (hasta 15 min)
  // y, si otro usuario confirmó la orden, se editaría una AUTORIZADA sin el
  // aviso. Mismas opciones de query que `usePurchaseOrder` (misma llave, así
  // que la caché se comparte); solo cambia el refetch al montar, aquí.
  const {
    data: detail,
    isFetchedAfterMount: isDetailFresh,
    isError: isDetailError,
    error: detailError,
  } = useQuery<PurchaseOrderDetail>({
    ...purchaseOrderQueryOptions(initialData.id),
    refetchOnMount: "always",
  });

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

  /**
   * El backend rechazó el PUT porque la orden ya no puede editarse (se canceló
   * o recibió en otro lado): reintentar no sirve, así que se cierra. El toast
   * con el motivo y el refetch de la fila los hace `useUpdatePurchaseOrder`.
   * Cualquier otro error deja el diálogo abierto con los cambios.
   */
  const handleBusinessRejection = () => onClose?.();

  // Renglones iniciales del paso de productos: sembrados desde los renglones
  // existentes de la orden, conservando `precio` y `descripcion` reales (no
  // solo la cantidad).
  //
  // `d.precio` puede venir AUSENTE si el backend filtró los importes por rol,
  // pero eso NO llega hasta aquí: la edición se bloquea antes (ver
  // `sinAccesoImportes` abajo). El `?? ""` queda solo como salvaguarda de tipos.
  const initialItems = useMemo<PurchaseOrderDetalleItem[]>(
    () =>
      (detail?.detalles ?? []).map((d) => ({
        producto: d.producto_id,
        cantidad: d.cantidad,
        precio: d.precio ?? "",
        descripcion: d.descripcion,
      })),
    [detail],
  );

  // Hasta que la lectura fresca del detalle termina (con éxito o con error) se
  // muestra el estado de carga, aunque haya una copia en caché.
  const isLoading = isOnboardingLoading || !isDetailFresh;
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

  // Bloqueo por visibilidad de importes. El detalle (`detail`) ya viene
  // filtrado por rol: si faltan los importes de cabecera, también faltan los
  // `precio` de cada renglón, y dejar avanzar el wizard haría que el PUT
  // guardara precios vacíos, PISANDO los reales. Se corta con un estado de
  // error en vez de mostrar el formulario. (Esta es la guarda que en el
  // listado sería código muerto: `PurchaseOrderColumns` trabaja con la fila
  // sin filtrar.)
  if (!canSeeAmounts(detail)) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          No puedes editar esta orden
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          No tienes acceso a los importes de la orden. Editarla sin ellos
          borraría los precios registrados, así que la edición está
          deshabilitada para tu rol.
        </p>
      </div>
    );
  }

  // Editar una AUTORIZADA la regresa a pendiente (el PUT siempre fija estatus
  // 2 y conserva el folio). Se lee de `detail`, consultado al abrir el wizard
  // (ver `refetchOnMount` arriba), y no de la fila del listado, que podría
  // estar vieja. Vive aquí, en el manager, para
  // que se vea en AMBOS pasos. Siempre se muestra en estatus 3: no hay registro
  // de envío al proveedor que permita condicionar la segunda frase.
  const isAuthorized = detail.estatus === PURCHASE_ORDER_STATUS.AUTORIZADA;

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={STEPS}
        currentStep={currentStep}
        labels={STEP_LABELS}
      />
      {isAuthorized && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Esta orden ya está autorizada. Al guardar los cambios volverá a
          «Pendiente a confirmar» y tendrá que confirmarse de nuevo; conservará
          su folio. Si ya se la enviaste al proveedor, reenvíasela después de
          confirmarla.
        </div>
      )}
      <div>
        {currentStep === "step-1" && (
          <PurchaseOrderEditStep1
            initialData={initialData}
            initialHeader={header ?? undefined}
            onboardingData={onboardingData}
            onSuccess={handleStep1Success}
          />
        )}
        {/*
          Una vez creado, el Step 2 se queda MONTADO y solo se oculta al volver
          al Step 1. Al desmontarse, su `quantities` se resembraba desde
          `initialItems` (solo corre en el inicializador del useState), así que
          los renglones que el usuario había quitado reaparecían y los que había
          agregado desaparecían, sin aviso y justo antes de guardar.
        */}
        {header !== null && (
          <div className={currentStep === "step-2" ? undefined : "hidden"}>
            <PurchaseOrderEditStep2
              initialData={initialData}
              header={header}
              onboardingData={onboardingData}
              initialItems={initialItems}
              onSuccess={handleStep2Success}
              onBusinessRejection={handleBusinessRejection}
              onBack={() => setCurrentStep("step-1")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
