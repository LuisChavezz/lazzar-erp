"use client";

import { FormSubmitButton, FormSecondaryButton } from "@/src/components/FormButtons";
import type { PurchaseOrderOnboardingData } from "../interfaces/purchase-order-onboarding.interface";
import type {
  PurchaseOrder,
  UpdatePurchaseOrderBody,
} from "../interfaces/purchase-order.interface";
import type { PurchaseOrderEditHeader } from "../schemas/purchase-order-edit.schema";
import type { PurchaseOrderLinesState } from "../hooks/usePurchaseOrderLines";
import { useUpdatePurchaseOrder } from "../hooks/useUpdatePurchaseOrder";
import { buildPurchaseOrderDetalle } from "../utils/buildPurchaseOrderDetalle";
import type { PurchaseOrderLine } from "../utils/purchaseOrderLines";
import { PurchaseOrderVariantLinesPicker } from "./PurchaseOrderVariantLinesPicker";
import { PurchaseOrderProductLinesList } from "./PurchaseOrderProductLinesList";
import type { PurchaseOrderHeaderFieldErrors } from "../utils/purchaseOrderHeaderErrors";
import { onboardingMonedaCodigo } from "../utils/onboardingMonedaCodigo";

interface PurchaseOrderEditStep2Props {
  /** Orden en edición — aporta el `pk` para el PUT. */
  initialData: PurchaseOrder;
  /** Encabezado capturado en el Step 1. */
  header: PurchaseOrderEditHeader;
  /**
   * La orden ya tiene folio: `tipo_compra` NO viaja en el PUT (el backend
   * rechaza cambiarlo y el Step 1 lo bloquea).
   */
  isTipoCompraLocked: boolean;
  /** Catálogos (incluye los productos disponibles). */
  onboardingData: PurchaseOrderOnboardingData;
  /**
   * Renglones guardados de la orden (`[]` si se descartaron al cambiar el tipo
   * de compra). Siguen a la vista aunque se desmarquen, para poder volver a
   * marcarlos; los marcados viven en `lines`.
   */
  seedLines: PurchaseOrderLine[];
  /**
   * Renglones elegidos, sembrados con los guardados. Viven en el step manager
   * para que el Step 1 pueda vaciarlos al cambiar el tipo de compra.
   */
  lines: PurchaseOrderLinesState;
  /** Llamado tras un PUT exitoso — paso final del wizard. */
  onSuccess: () => void;
  /**
   * Llamado cuando el backend rechaza el PUT porque la orden ya no puede
   * editarse: cancelada, con recepciones o facturas (400) o eliminada (404).
   * Ver `useUpdatePurchaseOrder`.
   */
  onOrderNoLongerEditable: () => void;
  /**
   * El backend rechazó campos del encabezado (400 por campo): el manager
   * regresa al Step 1 para mostrarlos bajo su campo.
   */
  onHeaderFieldErrors: (errors: PurchaseOrderHeaderFieldErrors) => void;
  /** Vuelve al Step 1 (encabezado). */
  onBack: () => void;
}

/**
 * Step 2 del flujo de edición: selección de productos y guardado.
 *
 * Reproduce la UI del paso de productos del alta, pero pre-poblada con los
 * renglones existentes de la orden (por producto, o por variante en los de
 * producto terminado capturados por SKU). Al guardar, arma el
 * body (encabezado del Step 1 + `detalles`) y envía el PUT vía
 * {@link useUpdatePurchaseOrder} — este es el paso final del wizard.
 */
export function PurchaseOrderEditStep2({
  initialData,
  header,
  isTipoCompraLocked,
  onboardingData,
  seedLines,
  lines,
  onSuccess,
  onOrderNoLongerEditable,
  onHeaderFieldErrors,
  onBack,
}: PurchaseOrderEditStep2Props) {
  // Código de la moneda elegida en el encabezado: prefijo de los precios
  // capturados (EC-606); sin moneda resuelta, sin prefijo.
  const monedaCodigo = onboardingMonedaCodigo(onboardingData, header.moneda);

  const { mutate: update, isPending } = useUpdatePurchaseOrder({
    onOrderNoLongerEditable,
    onHeaderFieldErrors,
  });
  // Producto terminado se compra por SKU (EC-657); materia prima, por producto.
  const isProductoTerminado = header.tipo_compra === "PT";

  const { hasPriceErrors } = lines;
  const selectedCount = lines.count;

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (selectedCount === 0 || hasPriceErrors) return;

    const detalle = buildPurchaseOrderDetalle(lines);

    // El PUT refleja la forma del alta: encabezado + renglones del detalle.
    // `pedidos` va SIEMPRE (reemplaza la lista completa); `tipo_compra` solo
    // sin folio. El campo legado `pedido` nunca se manda.
    const { tipo_compra, ...headerWithoutTipo } = header;
    const body: UpdatePurchaseOrderBody = isTipoCompraLocked
      ? { ...headerWithoutTipo, detalles: detalle }
      : { ...headerWithoutTipo, tipo_compra, detalles: detalle };
    update(
      { pk: initialData.id, body },
      { onSuccess: () => onSuccess() },
    );
  };

  return (
    <div className="space-y-4">
      {isProductoTerminado ? (
        <PurchaseOrderVariantLinesPicker
          lines={lines}
          seedLines={seedLines}
          monedaCodigo={monedaCodigo}
        />
      ) : (
        <PurchaseOrderProductLinesList
          catalog={onboardingData.busqueda.productos ?? []}
          lines={lines}
          seedLines={seedLines}
          monedaCodigo={monedaCodigo}
        />
      )}

      {/* ── Acciones ────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        <FormSecondaryButton label="Volver" onClick={onBack} disabled={isPending} />
        <FormSubmitButton
          isPending={isPending}
          disabled={selectedCount === 0 || hasPriceErrors || isPending}
          onClick={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          Guardar cambios
        </FormSubmitButton>
      </div>
    </div>
  );
}
