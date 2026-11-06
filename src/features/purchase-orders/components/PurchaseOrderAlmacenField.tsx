"use client";

import { FormSelect } from "@/src/components/FormSelect";
import type { FormFieldError } from "@/src/utils/getFieldError";
import type {
  PurchaseOrderOnboardingAlmacen,
  PurchaseOrderOnboardingSucursal,
} from "../interfaces/purchase-order-onboarding.interface";
import { almacenSelectState, type AlmacenSelectOption } from "../utils/purchaseOrderDelivery";
import { PurchaseOrderDeliveryAddress } from "./PurchaseOrderDeliveryAddress";

/**
 * Almacén destino + dirección de entrega del encabezado de la OC (EC-796),
 * compartido por el alta y la edición. Ambos dependen de la sucursal elegida,
 * así que el formulario los monta bajo UNA sola suscripción a ella y pasa aquí
 * el valor del campo `almacen`.
 *
 * - Solo se ofrecen los almacenes de la sucursal (los sin sucursal, nunca).
 * - `saved` (solo la edición) es el almacén guardado en la orden: mientras sea
 *   el valor del campo se sigue mostrando aunque ya no esté en el catálogo.
 * - Limpiar el almacén al cambiar la sucursal NO vive aquí: lo hace el
 *   manejador de la sucursal (`almacenTrasCambioDeSucursal`).
 */
export function PurchaseOrderAlmacenField({
  name,
  sucursalId,
  value,
  onChange,
  onBlur,
  error,
  almacenes,
  sucursales,
  emptyLabel,
  saved = null,
  selectClassName,
  addressClassName,
}: {
  name: string;
  sucursalId: number;
  /** `0` = sin almacén. */
  value: number;
  onChange: (next: number) => void;
  onBlur: () => void;
  error?: FormFieldError;
  almacenes: readonly PurchaseOrderOnboardingAlmacen[];
  sucursales: readonly PurchaseOrderOnboardingSucursal[];
  /** Etiqueta de la opción `0`: "Seleccionar almacén…" en el alta, "Sin almacén destino" en la edición. */
  emptyLabel: string;
  saved?: AlmacenSelectOption | null;
  selectClassName?: string;
  addressClassName?: string;
}) {
  const almacen = almacenSelectState({
    almacenes,
    sucursalId,
    emptyLabel,
    selected: saved && value === saved.value ? saved : null,
  });

  return (
    <>
      <FormSelect
        label="Almacén destino"
        className={selectClassName}
        name={name}
        value={value}
        options={almacen.options}
        disabled={almacen.disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isNaN(next) ? 0 : next);
        }}
        onBlur={onBlur}
        error={error}
      />

      {/* ── Dirección de entrega (solo lectura) ─────────────────────── */}
      <PurchaseOrderDeliveryAddress
        className={addressClassName}
        sucursal={sucursales.find((s) => s.id_sucursal === sucursalId)}
      />
    </>
  );
}
