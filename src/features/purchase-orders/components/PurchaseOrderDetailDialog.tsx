"use client";

import { ComprasIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { usePurchaseOrder } from "../hooks/usePurchaseOrder";
import type { PurchaseOrderDetalle } from "../interfaces/purchase-order.interface";

// ── Configuración visual por estatus ─────────────────────────────────────────

const ESTATUS_CFG: Record<number, { cls: string; dot: string }> = {
  1: { cls: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300", dot: "bg-slate-400" },
  4: { cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-400" },
  5: { cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500" },
};

// ── Helpers de formato ────────────────────────────────────────────────────────

const formatCurrency = (value: string | number) =>
  Number(value).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("es-MX") : "—";

// ── Sub-componentes ────────────────────────────────────────────────────────────

const EstatusBadge = ({ estatus, label }: { estatus: number; label: string }) => {
  const cfg = ESTATUS_CFG[estatus] ?? ESTATUS_CFG[1];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
};

/** Campo etiqueta/valor para la rejilla de información de la orden */
const InfoField = ({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <span className="text-slate-400 dark:text-slate-500">{label}</span>
    <div className="font-medium text-slate-700 dark:text-slate-200 mt-0.5">{children}</div>
  </div>
);

/** Tabla con los renglones de producto del detalle */
const DetalleTable = ({ detalles }: { detalles: PurchaseOrderDetalle[] }) => {
  if (detalles.length === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 italic px-1 py-4 text-center">
        Esta orden no tiene productos registrados.
      </p>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 dark:bg-zinc-800/90 backdrop-blur">
          <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">Descripción</th>
            <th className="px-3 py-2 font-medium text-right">Piezas</th>
            <th className="px-3 py-2 font-medium text-right">Cantidad</th>
            <th className="px-3 py-2 font-medium text-right">Precio</th>
            <th className="px-3 py-2 font-medium text-right">Descuento</th>
            <th className="px-3 py-2 font-medium text-right">Importe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {detalles.map((item, index) => (
            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.descripcion}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {item.piezas.toLocaleString("es-MX")}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {item.cantidad.toLocaleString("es-MX")}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {formatCurrency(item.precio)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {formatCurrency(item.descuento)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                {formatCurrency(item.importe)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Componente principal del diálogo ──────────────────────────────────────────

interface PurchaseOrderDetailDialogProps {
  /** ID de la orden a consultar. `null` mantiene la consulta deshabilitada. */
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseOrderDetailDialog({
  orderId,
  open,
  onOpenChange,
}: PurchaseOrderDetailDialogProps) {
  // Solo se dispara la petición cuando el diálogo está abierto.
  const { purchaseOrder, isLoading, isError, error } = usePurchaseOrder(orderId, open);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="760px"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2.5 pr-8">
          <ComprasIcon className="w-5 h-5 text-sky-500 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-tight text-slate-800 dark:text-slate-100">
              Detalle de Orden de Compra
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-normal mt-0.5">
              {purchaseOrder ? purchaseOrder.folio : "Cargando…"}
            </p>
          </div>
        </div>
      }
    >
      {/* ── Estado: cargando ──────────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
          <span className="ml-3 text-sm text-slate-500">
            Cargando detalle de la orden...
          </span>
        </div>
      )}

      {/* ── Estado: error ─────────────────────────────────────────────────── */}
      {isError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            Error al cargar el detalle de la orden
          </p>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">
            {(error as Error)?.message ?? "Intenta nuevamente más tarde."}
          </p>
        </div>
      )}

      {/* ── Estado: datos cargados ────────────────────────────────────────── */}
      {!isLoading && !isError && purchaseOrder && (
        <div className="space-y-5">
          {/* Información general de la orden */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
            <InfoField label="Folio">
              <span className="font-mono">{purchaseOrder.folio}</span>
            </InfoField>
            <InfoField label="Estatus">
              <EstatusBadge
                estatus={purchaseOrder.estatus}
                label={purchaseOrder.estatus_label}
              />
            </InfoField>
            <InfoField label="Proveedor">{purchaseOrder.proveedor_nombre}</InfoField>
            <InfoField label="Referencia">{purchaseOrder.referencia || "—"}</InfoField>
            <InfoField label="Fecha OC">{formatDate(purchaseOrder.fecha_oc)}</InfoField>
            <InfoField label="Entrega estimada">
              {formatDate(purchaseOrder.fecha_entrega_estimada)}
            </InfoField>
            <InfoField label="Fecha autorización">
              {formatDate(purchaseOrder.fecha_autorizacion)}
            </InfoField>
            {purchaseOrder.observaciones?.trim() && (
              <InfoField label="Observaciones" className="col-span-2 sm:col-span-3">
                <span className="leading-snug text-slate-600 dark:text-slate-300">
                  {purchaseOrder.observaciones}
                </span>
              </InfoField>
            )}
          </div>

          {/* Detalle de productos */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Productos
            </h3>
            <DetalleTable detalles={purchaseOrder.detalles} />
          </div>

          {/* Resumen financiero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 text-xs">
            <InfoField label="Subtotal">
              <span className="tabular-nums">{formatCurrency(purchaseOrder.subtotal)}</span>
            </InfoField>
            <InfoField label="Descuento">
              <span className="tabular-nums">{formatCurrency(purchaseOrder.descuento)}</span>
            </InfoField>
            <InfoField label="Impuestos">
              <span className="tabular-nums">{formatCurrency(purchaseOrder.impuestos)}</span>
            </InfoField>
            <InfoField label="Total">
              <span className="tabular-nums text-sm font-semibold text-slate-800 dark:text-white">
                {formatCurrency(purchaseOrder.total)}
              </span>
            </InfoField>
          </div>
        </div>
      )}
    </MainDialog>
  );
}
