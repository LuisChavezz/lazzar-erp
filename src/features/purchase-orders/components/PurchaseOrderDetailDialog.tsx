"use client";

import { useState } from "react";
import { ChevronRightIcon, ComprasIcon, RecepcionesIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import { usePurchaseOrder } from "../hooks/usePurchaseOrder";
import { PurchaseOrderReceiptDetailDialog } from "@/src/features/purchase-order-receipts/components/PurchaseOrderReceiptDetailDialog";
import { RECEIPT_STATUS_CONFIG } from "@/src/features/receipts/constants/receiptStatus";
import { formatLocalDate } from "@/src/utils/formatDate";
import {
  PURCHASE_ORDER_ESTATUS_CFG,
  PURCHASE_ORDER_STATUS,
} from "../constants/purchaseOrderStatus";
import type {
  PurchaseOrderDetalle,
  PurchaseOrderReceipt,
} from "../interfaces/purchase-order.interface";

// ── Helpers de formato ────────────────────────────────────────────────────────

const formatCurrency = (value: string | number) =>
  Number(value).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

// ── Sub-componentes ────────────────────────────────────────────────────────────

const EstatusBadge = ({ estatus, label }: { estatus: number; label: string }) => {
  const cfg =
    PURCHASE_ORDER_ESTATUS_CFG[estatus] ??
    PURCHASE_ORDER_ESTATUS_CFG[PURCHASE_ORDER_STATUS.BORRADOR];
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

/** Tarjeta compacta de una recepción asociada a la orden */
const RecepcionCard = ({
  recepcion,
  onView,
}: {
  recepcion: PurchaseOrderReceipt;
  onView: (id: number) => void;
}) => {
  // Detalle secundario opcional: remisión y/o factura de referencia.
  const extra = [
    recepcion.remision ? `Remisión: ${recepcion.remision}` : null,
    recepcion.factura_referencia
      ? `Factura: ${recepcion.factura_referencia}`
      : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <button
      type="button"
      onClick={() => onView(recepcion.id)}
      className="group w-full text-left rounded-xl border border-slate-100 dark:border-white/10 px-4 py-3 transition-colors cursor-pointer hover:border-sky-200 hover:bg-slate-50 dark:hover:border-sky-500/40 dark:hover:bg-white/5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <RecepcionesIcon className="w-4 h-4 text-sky-500 shrink-0" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold text-slate-800 dark:text-white">
              {recepcion.folio}
            </span>
            <StatusBadge status={recepcion.estatus_label} config={RECEIPT_STATUS_CONFIG} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recibido el {formatLocalDate(recepcion.fecha_recepcion)}
            <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
              ·
            </span>
            Almacén: {recepcion.almacen_nombre}
          </p>
          {extra && (
            <p className="text-xs text-slate-400 dark:text-slate-500">{extra}</p>
          )}
        </div>
        <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500 transition-colors group-hover:text-sky-600 dark:group-hover:text-sky-400">
          <span className="hidden sm:inline">Ver detalles</span>
          <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
};

/** Sección "Recepciones": lista las recepciones asociadas a la orden. */
const RecepcionesSection = ({
  recepciones,
  onViewReceipt,
}: {
  recepciones: PurchaseOrderReceipt[];
  onViewReceipt: (id: number) => void;
}) => (
  <div>
    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
      Recepciones{recepciones.length > 0 && ` (${recepciones.length})`}
    </h3>
    {recepciones.length === 0 ? (
      <p className="text-sm text-slate-400 dark:text-slate-500 italic px-1 py-3">
        Aún no se han registrado recepciones para esta orden.
      </p>
    ) : (
      <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
        {recepciones.map((recepcion) => (
          <RecepcionCard
            key={recepcion.id}
            recepcion={recepcion}
            onView={onViewReceipt}
          />
        ))}
      </div>
    )}
  </div>
);

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

  // Recepción cuyo detalle se está consultando. `null` mantiene deshabilitada la
  // consulta del diálogo anidado (misma convención centinela que `useReceiptDetail`).
  const [viewingReceiptId, setViewingReceiptId] = useState<number | null>(null);

  return (
    <>
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
              <InfoField label="Fecha OC">{formatLocalDate(purchaseOrder.fecha_oc)}</InfoField>
              <InfoField label="Entrega estimada">
                {formatLocalDate(purchaseOrder.fecha_entrega_estimada)}
              </InfoField>
              <InfoField label="Fecha autorización">
                {formatLocalDate(purchaseOrder.fecha_autorizacion)}
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

            {/* Recepciones asociadas */}
            <RecepcionesSection
              recepciones={purchaseOrder.recepciones}
              onViewReceipt={setViewingReceiptId}
            />
          </div>
        )}
      </MainDialog>

      {/* Diálogo anidado: detalle de una recepción específica. Se reutiliza el
          diálogo especializado en OC (las recepciones embebidas en una orden de
          compra son siempre `tipo_origen: "OC"`), tal cual, sin modificarlo. */}
      <PurchaseOrderReceiptDetailDialog
        receiptId={viewingReceiptId}
        open={viewingReceiptId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setViewingReceiptId(null);
        }}
      />
    </>
  );
}
