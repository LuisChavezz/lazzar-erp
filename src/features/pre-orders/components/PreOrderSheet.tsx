"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  LineItemsTable,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { ChevronDownIcon, OrdenesIcon } from "@/src/components/Icons";
import {
  OrderChip,
  SheetPanel,
  SheetSection,
} from "@/src/features/orders/components/OrderSheetPrimitives";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import { usePreOrderDetail } from "../hooks/usePreOrders";
import { usePreOrderActions } from "../hooks/usePreOrderActions";
import {
  PRE_ORDER_NEXT_STEP,
  PRE_ORDER_STATUS_CFG,
  canCancelPreOrder,
  canConfirmPreOrder,
  canCreateOpFromPreOrder,
} from "../constants/preOrderStatus";
import type { PreOrderDetail } from "../interfaces/pre-order.interface";
import { PreOrderCreateOpDialog } from "./PreOrderCreateOpDialog";
import { PreOrderTracker } from "./PreOrderTracker";
import { NEED_STATUS_CFG, PreOrderHistory, RegresoAlert, SemaforoBadge } from "./PreOrderTracking";

const LINK_CLASS =
  "font-mono font-semibold text-sky-600 dark:text-sky-400 underline decoration-dotted underline-offset-4";

const BTN_BASE =
  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_PRIMARY = `${BTN_BASE} bg-sky-600 text-white hover:bg-sky-700`;
const BTN_SUCCESS = `${BTN_BASE} bg-emerald-600 text-white hover:bg-emerald-700`;
const BTN_GHOST = `${BTN_BASE} text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10`;

/**
 * Pre-orden de producción de un pedido: estatus y qué sigue, materiales
 * (requerido / existencia / faltante), OC ligadas, prendas y las acciones
 * del flujo (confirmar existencias, crear OP, cancelar).
 *
 * La usan el detalle de fabricación especial y la página de la pre-orden.
 */
export function PreOrderSheet({ preOrderId }: { preOrderId: number }) {
  const { data, isLoading, isInitialError, isDefinitiveError } = usePreOrderDetail(preOrderId);

  if (isLoading && !data) {
    return (
      <SheetSection icon={<OrdenesIcon className="w-5 h-5" />} title="Pre-orden de producción">
        <div className="h-32 rounded-3xl bg-slate-100 dark:bg-white/5 animate-pulse" />
      </SheetSection>
    );
  }
  if (!data || isInitialError || isDefinitiveError) {
    return (
      <SheetSection icon={<OrdenesIcon className="w-5 h-5" />} title="Pre-orden de producción">
        <EmptyLines>
          {isDefinitiveError
            ? "La pre-orden no está disponible."
            : "No se pudo cargar la pre-orden. Recarga la página para intentar de nuevo."}
        </EmptyLines>
      </SheetSection>
    );
  }
  return <PreOrderSheetContent data={data} />;
}

function PreOrderSheetContent({ data }: { data: PreOrderDetail }) {
  const { confirmar, crearOp, cancelar } = usePreOrderActions(data.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [opOpen, setOpOpen] = useState(false);
  const [showLines, setShowLines] = useState(false);

  const faltaReal = (m: PreOrderDetail["materiales"][number]) => m.faltante_real ?? m.faltante;
  const faltantes = data.materiales.filter((m) => faltaReal(m) > 0);
  const necesidades = data.necesidades ?? [];
  const [showHistory, setShowHistory] = useState(false);
  const piezas = data.detalles.reduce((acc, d) => acc + d.cantidad, 0);
  const folio = data.pedido_folio || `#${data.pedido}`;

  return (
    <SheetSection
      icon={<OrdenesIcon className="w-5 h-5" />}
      title="Pre-orden de producción"
      subtitle="Del BOM a la orden de producción."
      badges={
        <>
          <StatusBadge status={data.estatus} config={PRE_ORDER_STATUS_CFG} />
          {data.estatus !== "convertida" && data.estatus !== "cancelada" && (
            <SemaforoBadge semaforo={data.semaforo} />
          )}
        </>
      }
    >
      {data.regreso && data.estatus === "faltan_materiales" && <RegresoAlert regreso={data.regreso} />}

      <div className="mb-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-5">
        <PreOrderTracker estatus={data.estatus} late={data.semaforo === "rojo"} />
      </div>

      {/* Qué sigue + acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-5 py-4 mb-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {PRE_ORDER_NEXT_STEP[data.estatus]}
          </p>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex gap-1">
              <dt>Compromiso:</dt>
              <dd className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {formatShortCalendarDate(data.fecha_compromiso)}
              </dd>
            </div>
            <div className="flex gap-1">
              <dt>Material estimado:</dt>
              <dd className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                {data.fecha_estimada_material
                  ? formatShortCalendarDate(data.fecha_estimada_material)
                  : "Sin fecha"}
              </dd>
            </div>
            {data.dias_en_estatus !== undefined && (
              <div className="flex gap-1">
                <dt>En este estatus:</dt>
                <dd className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                  {data.dias_en_estatus} {data.dias_en_estatus === 1 ? "día" : "días"}
                </dd>
              </div>
            )}
          </dl>
          {data.op && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              OP:{" "}
              <Link href={`/manufacturing/production-orders/${data.op}`} className={LINK_CLASS}>
                {data.op_folio || `#${data.op}`}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {canConfirmPreOrder(data.estatus) && (
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={confirmar.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              Confirmar existencias
            </button>
          )}
          {canCreateOpFromPreOrder(data.estatus) && (
            <button
              type="button"
              className={BTN_SUCCESS}
              disabled={crearOp.isPending}
              onClick={() => setOpOpen(true)}
            >
              Crear OP
            </button>
          )}
          {canCancelPreOrder(data.estatus) && (
            <button
              type="button"
              className={BTN_GHOST}
              disabled={cancelar.isPending}
              onClick={() => setCancelOpen(true)}
            >
              Cancelar pre-orden
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Materiales */}
        <SheetPanel title={`Materiales (${data.materiales.length})`} className="xl:col-span-2 p-5!">
          {data.materiales.length === 0 ? (
            <EmptyLines>Las muestras aún no tienen lista de materiales.</EmptyLines>
          ) : (
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-medium">Material</th>
                  <th className="px-3 py-2 font-medium text-right">Requerido</th>
                  <th className="px-3 py-2 font-medium text-right">Existencia</th>
                  <th className="px-3 py-2 font-medium text-right" title="Pedido en una OC y aún no recibido">En camino</th>
                  <th className="px-3 py-2 font-medium text-right" title="Lo apartan otras pre-órdenes abiertas">Otras pre-órdenes</th>
                  <th className="px-3 py-2 font-medium text-right" title="Requerido − existencia − en camino">Falta pedir</th>
                </>
              }
            >
              {data.materiales.map((m) => (
                <tr key={m.producto_id} className={faltaReal(m) > 0 ? "bg-rose-50/50 dark:bg-rose-500/5" : undefined}>
                  <td className="px-3 py-2">
                    <span className="block font-medium text-slate-800 dark:text-white">{m.nombre}</span>
                    <span className="font-mono text-[11px] text-slate-400">{m.codigo}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {formatQuantityValue(m.requerido)} {m.unidad ?? ""}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {formatQuantityValue(m.existencia)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-violet-700 dark:text-violet-300">
                    {m.en_transito ? formatQuantityValue(m.en_transito) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">
                    {m.comprometido ? formatQuantityValue(m.comprometido) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">
                    {faltaReal(m) > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400">{formatQuantityValue(faltaReal(m))}</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">Completo</span>
                    )}
                  </td>
                </tr>
              ))}
            </LineItemsTable>
          )}
        </SheetPanel>

        {/* Resumen + OC */}
        <div className="space-y-6">
          <SheetPanel title="Resumen" className="p-5!">
            <dl className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Piezas", formatQuantityValue(piezas || data.piezas_total)],
                ["Tallas", String(data.detalles.length || data.tallas_total)],
                ["Faltan", String(faltantes.length)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 px-2 py-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
                  <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </SheetPanel>

          {necesidades.length > 0 && (
            <SheetPanel title={`Necesidades de compra (${necesidades.length})`} className="p-5!">
              <ul className="space-y-2">
                {necesidades.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800 dark:text-white">
                        {n.material_nombre || n.material_codigo || `Material #${n.material ?? n.id}`}
                      </span>
                      <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {formatQuantityValue(n.cantidad)} {n.unidad ?? ""}
                      </span>
                    </span>
                    <StatusBadge status={n.estatus ?? "pendiente"} config={NEED_STATUS_CFG} />
                  </li>
                ))}
              </ul>
            </SheetPanel>
          )}

          <SheetPanel title={`Órdenes de compra (${data.ordenes_compra.length})`} className="p-5!">
            {data.ordenes_compra.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ninguna todavía. Compras junta las necesidades de varios pedidos en una sola OC.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.ordenes_compra.map((oc) => (
                  <li key={oc.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/procurement/purchase-orders/${oc.id}`} className={LINK_CLASS}>
                      {oc.folio || `OC #${oc.id}`}
                    </Link>
                    {(oc.estatus_display || oc.estatus_label) && (
                      <OrderChip>{oc.estatus_display || oc.estatus_label}</OrderChip>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SheetPanel>
        </div>
      </div>

      {/* Prendas (plegable) */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowLines((v) => !v)}
          aria-expanded={showLines}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
        >
          Prendas de la pre-orden ({data.detalles.length})
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${showLines ? "rotate-180" : ""}`} />
        </button>
        {showLines && (
          <div className="mt-3">
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Prenda</th>
                  <th className="px-3 py-2 font-medium">Talla</th>
                  <th className="px-3 py-2 font-medium">Color</th>
                  <th className="px-3 py-2 font-medium text-right">Cantidad</th>
                </>
              }
            >
              {data.detalles.map((d) => (
                <tr key={d.id}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">{d.sku}</td>
                  <td className="px-3 py-2 text-slate-800 dark:text-white">{d.nombre}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{textOrDash(d.talla_nombre)}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{textOrDash(d.color_nombre)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                    {formatQuantityValue(d.cantidad)}
                  </td>
                </tr>
              ))}
            </LineItemsTable>
          </div>
        )}
      </div>

      {/* Historial (plegable) */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          aria-expanded={showHistory}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
        >
          Historial de la pre-orden
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${showHistory ? "rotate-180" : ""}`} />
        </button>
        {showHistory && (
          <div className="mt-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-5 py-4">
            <PreOrderHistory preOrderId={data.id} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar existencias"
        description={
          faltantes.length > 0
            ? `Faltan ${faltantes.length} ${faltantes.length === 1 ? "material" : "materiales"}. Pasarán a compras como necesidades, para juntarlas con las de otros pedidos en una sola orden de compra.`
            : "Hay existencia de todos los materiales. La pre-orden quedará lista para producir."
        }
        confirmText="Confirmar"
        confirmColor="sky"
        closeOnConfirm={false}
        busy={confirmar.isPending}
        onConfirm={() => confirmar.mutate(undefined, { onSettled: () => setConfirmOpen(false) })}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar pre-orden"
        description={`La pre-orden del pedido ${folio} dejará de avanzar. Esta acción no se puede deshacer.`}
        confirmText="Cancelar pre-orden"
        cancelText="Volver"
        confirmColor="red"
        closeOnConfirm={false}
        busy={cancelar.isPending}
        onConfirm={() => cancelar.mutate(undefined, { onSettled: () => setCancelOpen(false) })}
      />
      <PreOrderCreateOpDialog
        open={opOpen}
        onOpenChange={setOpOpen}
        folio={folio}
        isPending={crearOp.isPending}
        onSubmit={(body) => crearOp.mutate(body, { onSuccess: () => setOpOpen(false) })}
      />
    </SheetSection>
  );
}
