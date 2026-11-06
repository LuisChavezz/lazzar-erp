"use client";

import { InfoField, textOrDash } from "@/src/components/DetailDialogPrimitives";
import type { PurchaseOrderOnboardingSucursal } from "../interfaces/purchase-order-onboarding.interface";
import { optionalText } from "../utils/purchaseOrderDelivery";

/**
 * Dirección de entrega de la sucursal elegida en el encabezado de la OC
 * (EC-796): lo que el proveedor necesita para saber a dónde enviar. Siempre
 * visible, con "—" por dato faltante (también sin sucursal elegida). Solo
 * lectura: la dirección se captura en el catálogo de sucursales.
 */
export function PurchaseOrderDeliveryAddress({
  sucursal,
  className = "",
}: {
  sucursal: PurchaseOrderOnboardingSucursal | undefined;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 rounded-xl bg-slate-50 dark:bg-white/5 px-4 py-3 text-xs ${className}`}
    >
      <InfoField label="Dirección de entrega" className="sm:col-span-2">
        {textOrDash(optionalText(sucursal?.direccion))}
      </InfoField>
      <InfoField label="Teléfono">
        <span className="tabular-nums">{textOrDash(optionalText(sucursal?.telefono))}</span>
      </InfoField>
    </div>
  );
}
