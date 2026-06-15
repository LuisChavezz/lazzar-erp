"use client";

import { FormSubmitButton } from "@/src/components/FormButtons";
import type { PurchaseOrderOnboardingResponse } from "../interfaces/purchase-order-onboarding.interface";
import { useConfirmPurchaseOrder } from "../hooks/useConfirmPurchaseOrder";

interface PurchaseOrderOnboardingStep3Props {
  /** The full response from the Step 2 POST (contains orden_compra details + detalle). */
  step2Response: PurchaseOrderOnboardingResponse;
  /** Called after confirmation succeeds. */
  onClose: () => void;
}

export function PurchaseOrderOnboardingStep3({
  step2Response,
  onClose,
}: PurchaseOrderOnboardingStep3Props) {
  const { mutateAsync: confirm, isPending } = useConfirmPurchaseOrder();
  const { orden_compra, detalle } = step2Response;

  const handleConfirm = () => {
    void confirm(orden_compra.id).then(() => {
      // Toast is handled by the mutation hook.
      onClose();
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Order summary ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          Resumen de la orden #{orden_compra.id}
        </h3>

        {/* Key fields */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-slate-500">Referencia</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {orden_compra.referencia || "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Fecha OC</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {orden_compra.fecha_oc}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Tipo</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {orden_compra.tipo}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Total de piezas</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {orden_compra.total_piezas}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-xs text-slate-500">Observaciones</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {orden_compra.observaciones || "—"}
            </p>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-200 dark:border-white/10 pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              ${orden_compra.subtotal}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Impuestos</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              ${orden_compra.impuestos}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span className="text-slate-700 dark:text-slate-300">Total</span>
            <span className="text-slate-900 dark:text-white">
              ${orden_compra.total}
            </span>
          </div>
        </div>
      </div>

      {/* ── Detalle items ───────────────────────────────────────────────── */}
      {detalle.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Productos agregados ({detalle.length})
            </h4>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-52 overflow-y-auto">
            {detalle.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {item.descripcion}
                  </p>
                  <p className="text-xs text-slate-500">
                    Cantidad: {item.cantidad} × ${item.precio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Confirm button ──────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <FormSubmitButton
          isPending={isPending}
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault();
            handleConfirm();
          }}
        >
          Confirmar orden
        </FormSubmitButton>
      </div>
    </div>
  );
}
