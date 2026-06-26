"use client";

import { FormSubmitButton, FormSecondaryButton } from "@/src/components/FormButtons";
import type {
  PurchaseOrderDetalleItem,
  PurchaseOrderOnboardingData,
} from "../interfaces/purchase-order-onboarding.interface";
import type {
  PurchaseOrder,
  UpdatePurchaseOrderBody,
} from "../interfaces/purchase-order.interface";
import type { PurchaseOrderEditFormValues } from "../schemas/purchase-order-edit.schema";
import { useUpdatePurchaseOrder } from "../hooks/useUpdatePurchaseOrder";

interface PurchaseOrderEditStep3Props {
  /** Orden en edición — aporta el `pk` y el folio para el resumen. */
  initialData: PurchaseOrder;
  /** Encabezado capturado en el Step 1. */
  header: PurchaseOrderEditFormValues;
  /** Productos capturados en el Step 2 (se envían en `detalles`). */
  items: PurchaseOrderDetalleItem[];
  /** Catálogos para resolver nombres legibles de sucursal/proveedor/moneda. */
  onboardingData: PurchaseOrderOnboardingData;
  /** Vuelve al Step 2 (productos). */
  onBack: () => void;
  /** Cierra el diálogo tras una actualización exitosa. */
  onClose: () => void;
}

// Las fechas vienen como "YYYY-MM-DD". `new Date("YYYY-MM-DD")` se interpreta
// como medianoche UTC y, en zonas con offset negativo (p. ej. UTC-6), mostraría
// el día anterior. Se fuerza medianoche local para que la revisión refleje la
// fecha elegida por el usuario.
const formatDate = (value: string) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("es-MX") : "—";

/**
 * Step 3 del flujo de edición: revisión y confirmación.
 *
 * Muestra un resumen del encabezado editado y de los productos, y al confirmar
 * envía el PUT vía {@link useUpdatePurchaseOrder}. La invalidación de queries y
 * el toast de éxito los maneja el hook de mutación; aquí solo cerramos el
 * diálogo en `onSuccess`.
 */
export function PurchaseOrderEditStep3({
  initialData,
  header,
  items,
  onboardingData,
  onBack,
  onClose,
}: PurchaseOrderEditStep3Props) {
  const { mutate: update, isPending } = useUpdatePurchaseOrder();

  const proveedor = onboardingData.busqueda.proveedores.find(
    (p) => p.id === header.proveedor,
  );
  const sucursal = onboardingData.catalogos.sucursales.find(
    (s) => s.id_sucursal === header.sucursal,
  );
  const moneda = onboardingData.catalogos.monedas.find(
    (m) => m.id === header.moneda,
  );

  // El proveedor puede no estar en el bucket de búsqueda; si coincide con el de
  // la orden, usamos su nombre ya conocido como respaldo.
  const proveedorLabel = proveedor
    ? `${proveedor.codigo} — ${proveedor.nombre}`
    : header.proveedor === initialData.proveedor
      ? initialData.proveedor_nombre
      : "—";

  const handleSave = () => {
    // El PUT refleja la forma del alta: encabezado + renglones del detalle.
    const body: UpdatePurchaseOrderBody = { ...header, detalles: items };
    update(
      { pk: initialData.id, body },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Resumen del encabezado ─────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          Cambios de la orden{" "}
          <span className="font-mono font-normal text-slate-500">
            {initialData.folio}
          </span>
        </h3>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-slate-500">Sucursal</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {sucursal ? `${sucursal.codigo} — ${sucursal.nombre}` : "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Proveedor</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {proveedorLabel}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Moneda</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {moneda ? `${moneda.codigo_iso} — ${moneda.nombre}` : "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Referencia</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {header.referencia || "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Fecha OC</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {formatDate(header.fecha_oc)}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-xs text-slate-500">Observaciones</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {header.observaciones.trim() ? header.observaciones : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Resumen de productos ────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Productos ({items.length})
            </h4>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-52 overflow-y-auto">
            {items.map((item, i) => (
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

      {/* ── Acciones ────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        <FormSecondaryButton
          label="Volver"
          onClick={onBack}
          disabled={isPending}
        />
        <FormSubmitButton
          isPending={isPending}
          disabled={isPending}
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
