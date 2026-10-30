"use client";

import { useState } from "react";
import { FormSubmitButton, FormSecondaryButton } from "@/src/components/FormButtons";
import type {
  PurchaseOrderEncabezados,
  PurchaseOrderOnboardingData,
} from "../interfaces/purchase-order-onboarding.interface";
import { usePostPurchaseOrder } from "../hooks/usePostPurchaseOrder";
import type { PurchaseOrderLinesState } from "../hooks/usePurchaseOrderLines";
import { buildPurchaseOrderDetalle } from "../utils/buildPurchaseOrderDetalle";
import { PurchaseOrderVariantLinesPicker } from "./PurchaseOrderVariantLinesPicker";
import { PurchaseOrderProductLinesList } from "./PurchaseOrderProductLinesList";
import type { PurchaseOrderHeaderFieldErrors } from "../utils/purchaseOrderHeaderErrors";
import { onboardingMonedaCodigo } from "../utils/onboardingMonedaCodigo";

interface PurchaseOrderOnboardingStep2Props {
  /** Captured encabezados from Step 1. */
  step1Data: PurchaseOrderEncabezados;
  onboardingData: PurchaseOrderOnboardingData | undefined;
  /**
   * Renglones elegidos. Viven en el step manager para que el Step 1 pueda
   * vaciarlos al cambiar el tipo de compra.
   */
  lines: PurchaseOrderLinesState;
  /** Called after the full order POST succeeds. This is the wizard's final step. */
  onSuccess?: () => void;
  /**
   * El backend rechazó campos del encabezado (400 por campo en el primer
   * POST): el manager regresa al Step 1 para mostrarlos bajo su campo.
   */
  onHeaderFieldErrors: (errors: PurchaseOrderHeaderFieldErrors) => void;
  /** Vuelve al Step 1 (encabezado), conservando lo capturado. */
  onBack: () => void;
}

export function PurchaseOrderOnboardingStep2({
  step1Data,
  onboardingData,
  lines,
  onSuccess,
  onHeaderFieldErrors,
  onBack,
}: PurchaseOrderOnboardingStep2Props) {
  // Código de la moneda elegida en el encabezado: prefijo de los precios
  // capturados (EC-606); sin moneda resuelta, sin prefijo.
  const monedaCodigo = onboardingMonedaCodigo(onboardingData, step1Data.orden_compra.moneda);

  // Producto terminado se compra por SKU (EC-657); materia prima, por producto.
  const isProductoTerminado = step1Data.orden_compra.tipo_compra === "PT";

  const { hasPriceErrors } = lines;
  const selectedCount = lines.count;
  const { mutateAsync: postDetalles, isPending } = usePostPurchaseOrder({ onHeaderFieldErrors });
  // Encabezado ya creado por un intento previo cuyo segundo POST (detalles)
  // falló. Se conserva para reintentar solo ese POST en lugar de crear un
  // encabezado duplicado.
  const [pendingOrder, setPendingOrder] = useState<{
    id: number;
    folio: string | null;
  } | null>(null);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (selectedCount === 0 || hasPriceErrors) return;

    const detalle = buildPurchaseOrderDetalle(lines);

    // Adjunta los renglones a un encabezado ya existente. Si falla, se
    // conserva su id/folio para reintentar solo este POST — evita crear un
    // segundo encabezado duplicado en el reintento.
    const attachDetalle = (ordenCompra: { id: number; folio: string | null }) =>
      postDetalles({ orden_compra_id: ordenCompra.id, detalle })
        .then(() => {
          setPendingOrder(null);
          // Toast is handled by the mutation hook.
          onSuccess?.();
        })
        .catch(() => {
          // Error toast is handled by the mutation hook.
          setPendingOrder(ordenCompra);
        });

    if (pendingOrder) {
      void attachDetalle(pendingOrder);
      return;
    }

    // Step 2 creates the Purchase Order by first posting the encabezados,
    // then posting the detalles with the returned orden_compra id. If this
    // first POST fails, no header was created — a plain retry from scratch
    // is safe, so there's nothing to remember here (unlike attachDetalle's
    // failure above).
    void postDetalles(step1Data)
      .then((createResponse) => attachDetalle(createResponse.orden_compra))
      .catch(() => {
        // Error toast is handled by the mutation hook.
      });
  };

  return (
    <div className="space-y-4">
      {isProductoTerminado ? (
        <PurchaseOrderVariantLinesPicker lines={lines} monedaCodigo={monedaCodigo} />
      ) : (
        <PurchaseOrderProductLinesList
          catalog={onboardingData?.busqueda.productos ?? []}
          lines={lines}
          monedaCodigo={monedaCodigo}
        />
      )}

      {/* ── Aviso de encabezado creado sin productos adjuntos ───────────── */}
      {pendingOrder && (
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          La orden{pendingOrder.folio ? ` ${pendingOrder.folio}` : ""} ya fue
          creada, pero no se pudieron agregar los productos. Vuelve a
          intentar — se reutilizará esa misma orden, no se creará una
          duplicada.
        </p>
      )}

      {/* ── Acciones ───────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        {/*
          Se bloquea el regreso cuando el encabezado ya fue creado en el
          servidor (`pendingOrder`): volver permitiría editarlo, pero ese
          cambio ya no viajaría a ningún lado — "Reintentar" solo adjunta los
          renglones a la orden existente. Mejor impedirlo que perderlo en
          silencio.
        */}
        <FormSecondaryButton
          label="Volver"
          onClick={onBack}
          disabled={isPending || pendingOrder !== null}
          title={
            pendingOrder
              ? "El encabezado ya fue creado; sus datos ya no pueden modificarse desde aquí."
              : undefined
          }
        />
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Creando..."
          disabled={selectedCount === 0 || isPending || hasPriceErrors}
          onClick={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {pendingOrder ? "Reintentar" : "Crear Orden"}
        </FormSubmitButton>
      </div>
    </div>
  );
}
