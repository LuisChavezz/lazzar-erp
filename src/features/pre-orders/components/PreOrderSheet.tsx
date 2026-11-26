"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { hasProductionPermission } from "@/src/utils/productionPermissions";
import { AccessibleLink } from "@/src/components/AccessibleLink";
import { purchaseOrderStatusEntry } from "@/src/features/purchase-orders/constants/purchaseOrderStatus";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import { productionOrderDetailPath } from "@/src/constants/workOrderRoutes";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  EmptyLines,
  LineItemsTable,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { ChevronDownIcon, OrdenesIcon } from "@/src/components/Icons";
import {
  SheetPanel,
  SheetSection,
} from "@/src/features/orders/components/OrderSheetPrimitives";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import { usePreOrderDetail } from "../hooks/usePreOrders";
import { usePreOrderActions } from "../hooks/usePreOrderActions";
import { isDraftOc, usePreOrderDraftOcQty } from "../hooks/usePreOrderDraftOcQty";
import {
  preOrderNextStep,
  isPreOrderOpCancelled,
  PRE_ORDER_STATUS_CFG,
  LINE_AVANCE_CFG,
  canAcceptPreOrder,
  isClosedPreOrderStatus,
  canCancelPreOrder,
  canConfirmPreOrder,
  canCreateOpFromPreOrder,
} from "../constants/preOrderStatus";
import type { PreOrderDetail } from "../interfaces/pre-order.interface";
import { PreOrderCreateOpDialog } from "./PreOrderCreateOpDialog";
import { isResurtido, preOrderReference } from "../utils/preOrderOrigin";
import { pedidoOmisionLabel } from "../utils/pedidosOmitidos";
import { PreOrderRejectDialog } from "./PreOrderRejectDialog";
import { PedidoVinculadoFolio } from "@/src/features/orders/components/PedidoVinculadoFolio";
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
  const { confirmar, crearOp, cancelar, aceptar, rechazar } = usePreOrderActions(data.id);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const resurtido = isResurtido(data);
  const hasAvance = data.detalles.some((d) => d.tipo_linea || d.avance);
  const porTipo = (t: "fabricado" | "compra") => data.detalles.filter((d) => d.tipo_linea === t).length;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [opOpen, setOpOpen] = useState(false);
  const [showLines, setShowLines] = useState(false);
  // "Crear OP" da de alta una orden de producción: exige `C-PRODUCCION-OP`
  // además del estatus (EC-895). Sin él el botón no se pinta, como el resto de
  // acciones que no aplican.
  const { data: session } = useSession();
  const canCreateOp = hasProductionPermission(session?.user, "OP", "C");

  const faltaReal = (m: PreOrderDetail["materiales"][number]) => m.faltante_real ?? m.faltante;
  // Lo ya capturado en una OC en borrador: está pedido, falta que Compras la
  // autorice. Sin restarlo, el material se vería como "falta pedir".
  const enBorrador = usePreOrderDraftOcQty(data.ordenes_compra);
  const sinPedir = (m: PreOrderDetail["materiales"][number]) =>
    Math.max(0, faltaReal(m) - (enBorrador[m.producto_id]?.cantidad ?? 0));
  // Ya convertida en OP: el material se surtió y la OP lo consumió. El backend
  // recalcula contra la existencia de HOY, así que su "faltante" ya no
  // significa nada (lo comprado y consumido vuelve a verse como faltante).
  const convertida = data.estatus === "convertida";
  const faltantes = convertida ? [] : data.materiales.filter((m) => sinPedir(m) > 0);
  const borradores = data.ordenes_compra.filter(isDraftOc);
  const necesidades = data.necesidades ?? [];
  const [showHistory, setShowHistory] = useState(false);
  const piezas = data.detalles.reduce((acc, d) => acc + d.cantidad, 0);
  const folio = preOrderReference(data);

  return (
    <SheetSection
      icon={<OrdenesIcon className="w-5 h-5" />}
      title="Pre-orden de producción"
      subtitle="Del BOM a la orden de producción."
      badges={
        <>
          <StatusBadge status={data.estatus} config={PRE_ORDER_STATUS_CFG} />
          {!isClosedPreOrderStatus(data.estatus) && (
            <SemaforoBadge semaforo={data.semaforo} />
          )}
        </>
      }
    >
      {data.regreso && data.estatus === "faltan_materiales" && <RegresoAlert regreso={data.regreso} />}
      {data.estatus === "rechazada" && (
        <div role="alert" className="mb-6 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">Producción rechazó este resurtido</p>
          <p className="mt-1 text-sm text-rose-700/90 dark:text-rose-200/90">{data.motivo_rechazo || "Sin motivo registrado."}</p>
        </div>
      )}
      {resurtido && (
        <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl border border-violet-200 dark:border-violet-500/20 bg-violet-50/60 dark:bg-violet-500/5 px-5 py-3 text-xs text-slate-600 dark:text-slate-300">
          <span className="rounded-full bg-violet-100 dark:bg-violet-500/15 px-2 py-0.5 font-semibold text-violet-700 dark:text-violet-300">Resurtido de stock</span>
          {data.sucursal_nombre && <span>Sucursal: <b className="text-slate-800 dark:text-white">{data.sucursal_nombre}</b></span>}
          {hasAvance && <span>Se fabrican: <b className="text-slate-800 dark:text-white tabular-nums">{porTipo("fabricado")}</b> SKU</span>}
          {hasAvance && <span>Se compran: <b className="text-slate-800 dark:text-white tabular-nums">{porTipo("compra")}</b> SKU</span>}
          {(data.pedidos_vinculados?.length ?? 0) > 0 && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              Pedidos:
              {data.pedidos_vinculados!.map((p) => {
                const omision = pedidoOmisionLabel(data, p);
                return (
                  <span
                    key={p.id}
                    className={`inline-flex items-center gap-1 rounded-full bg-white dark:bg-zinc-900 border px-2 py-0.5 ${omision ? "border-amber-300 dark:border-amber-500/40" : "border-slate-200 dark:border-white/10"}`}
                  >
                    <span className="font-semibold"><PedidoVinculadoFolio pedidoVinculado={{ id: p.id, folio: p.folio || `#${p.id}` }} pedidoFolio={p.folio} from="pre-orders" /></span>
                    {p.cliente_nombre && <span className="text-slate-500 dark:text-slate-400">{p.cliente_nombre}</span>}
                    {omision && <span className="font-semibold text-amber-700 dark:text-amber-400">· {omision}</span>}
                  </span>
                );
              })}
            </span>
          )}
          {data.notas && <span className="min-w-0 truncate" title={data.notas}>Notas: {data.notas}</span>}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-5">
        <PreOrderTracker estatus={data.estatus} late={data.semaforo === "rojo"} />
      </div>

      {/* Qué sigue + acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-5 py-4 mb-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {preOrderNextStep(data.estatus, data.op_estatus)}
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
              {/* Sin `R-PRODUCCION-OP` (la regla de la ruta), folio sin enlace (EC-895). */}
              <AccessibleLink
                href={productionOrderDetailPath(data.op)}
                className={LINK_CLASS}
                fallbackClassName="font-mono"
              >
                {data.op_folio || `#${data.op}`}
              </AccessibleLink>
              {/* Estatus de la OP ligada (EC-968): sobre todo, si se canceló. */}
              {data.op_estatus_display && <> · {data.op_estatus_display}</>}
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
          {canAcceptPreOrder(data.estatus) && (
            <>
              <button
                type="button"
                className={BTN_SUCCESS}
                disabled={aceptar.isPending || rechazar.isPending}
                onClick={() => setAcceptOpen(true)}
              >
                Aceptar resurtido
              </button>
              <button
                type="button"
                className={BTN_GHOST}
                disabled={aceptar.isPending || rechazar.isPending}
                onClick={() => setRejectOpen(true)}
              >
                Rechazar
              </button>
            </>
          )}
          {canCreateOp && canCreateOpFromPreOrder(data.estatus) && (
            <button
              type="button"
              className={BTN_SUCCESS}
              disabled={crearOp.isPending}
              onClick={() => setOpOpen(true)}
            >
              Crear OP
            </button>
          )}
          {canCancelPreOrder(data.estatus, data.op_estatus) && (
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
            <EmptyLines>
              {resurtido
                ? data.estatus === "pendiente_aceptar"
                  ? "Los materiales se calculan cuando producción acepte el resurtido."
                  : "Este resurtido no lleva SKUs fabricados: todo se compra."
                : "Las muestras aún no tienen lista de materiales."}
            </EmptyLines>
          ) : (
            <>
            {convertida && (
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Todo el material se surtió y pasó a la OP. La existencia es la de hoy, después de que la OP lo tomó.
              </p>
            )}
            <LineItemsTable
              head={
                <>
                  <th className="px-3 py-2 font-medium">Material</th>
                  <th className="px-3 py-2 font-medium text-right">Requerido</th>
                  <th className="px-3 py-2 font-medium text-right">Existencia</th>
                  <th className="px-3 py-2 font-medium text-right" title="Pedido en una OC y aún no recibido">En camino</th>
                  <th className="px-3 py-2 font-medium text-right" title="Lo apartan otras pre-órdenes abiertas">Otras pre-órdenes</th>
                  <th className="px-3 py-2 font-medium text-right">Estado</th>
                </>
              }
            >
              {data.materiales.map((m) => (
                <tr key={m.producto_id} className={!convertida && sinPedir(m) > 0 ? "bg-rose-50/50 dark:bg-rose-500/5" : undefined}>
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
                  <td className="px-3 py-2 text-right">
                    <MaterialEstado
                      surtido={convertida}
                      falta={faltaReal(m)}
                      enBorrador={Math.min(faltaReal(m), enBorrador[m.producto_id]?.cantidad ?? 0)}
                      unidad={m.unidad}
                    />
                  </td>
                </tr>
              ))}
            </LineItemsTable>
            </>
          )}
        </SheetPanel>

        {/* Resumen + OC */}
        <div className="space-y-6">
          <SheetPanel title="Resumen" className="p-5!">
            <dl className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Piezas", formatQuantityValue(piezas || data.piezas_total)],
                [resurtido ? "SKU" : "Tallas", String(data.detalles.length || data.tallas_total)],
                ["Por pedir", String(faltantes.length)],
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
              <>
              {borradores.length > 0 && (
                <p className="mb-3 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  El material ya está en la OC, pero sigue en <b>borrador</b>. Cuando Compras la autorice y la envíe al
                  proveedor, cuenta como <b>en camino</b>.
                </p>
              )}
              <ul className="space-y-2">
                {data.ordenes_compra.map((oc) => (
                  <li key={oc.id} className="flex items-center justify-between gap-2 text-sm">
                    {/* Sin `R-COMPRAS-OC` (la regla de la ruta), folio sin enlace (EC-895). */}
                    <AccessibleLink
                      href={purchaseOrderDetailHref(oc.id)}
                      className={LINK_CLASS}
                      fallbackClassName="font-mono"
                    >
                      {oc.folio || `OC #${oc.id}`}
                    </AccessibleLink>
                    {oc.estatus != null && (
                      <StatusBadge
                        status={String(oc.estatus)}
                        config={{ [String(oc.estatus)]: purchaseOrderStatusEntry(Number(oc.estatus), oc.estatus_display || oc.estatus_label) }}
                      />
                    )}
                  </li>
                ))}
              </ul>
              </>
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
          {resurtido ? "SKUs del resurtido" : "Prendas de la pre-orden"} ({data.detalles.length})
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
                  {hasAvance && <th className="px-3 py-2 font-medium">Se surte</th>}
                  {hasAvance && <th className="px-3 py-2 font-medium">Avance</th>}
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
                    {formatQuantityValue(d.cantidad)}{d.unidad && d.unidad !== "pz" ? ` ${d.unidad}` : ""}
                  </td>
                  {hasAvance && (
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                      {d.tipo_linea === "compra" ? "Compra" : d.tipo_linea === "fabricado" ? "Fabricación" : "—"}
                    </td>
                  )}
                  {hasAvance && (
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {d.avance?.estado ? <StatusBadge status={d.avance.estado} config={LINE_AVANCE_CFG} /> : <span className="text-xs text-slate-400">—</span>}
                        {d.avance?.op ? (
                          <AccessibleLink
                            href={productionOrderDetailPath(d.avance.op)}
                            className="font-mono text-xs text-sky-600 dark:text-sky-400 hover:underline"
                            fallbackClassName="font-mono text-xs text-slate-600 dark:text-slate-300"
                          >
                            {d.avance.op_folio || `OP #${d.avance.op}`}
                          </AccessibleLink>
                        ) : null}
                        {d.avance?.orden_compra ? (
                          <AccessibleLink
                            href={purchaseOrderDetailHref(d.avance.orden_compra)}
                            className="font-mono text-xs text-sky-600 dark:text-sky-400 hover:underline"
                            fallbackClassName="font-mono text-xs text-slate-600 dark:text-slate-300"
                          >
                            {d.avance.orden_compra_folio || `OC #${d.avance.orden_compra}`}
                          </AccessibleLink>
                        ) : null}
                        {d.tipo_linea === "compra" && d.avance?.cantidad_recibida ? (
                          <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                            Recibido {formatQuantityValue(d.avance.cantidad_recibida)} / {formatQuantityValue(d.cantidad)} {d.unidad ?? ""}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  )}
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
        confirmColor="blue"
        closeOnConfirm={false}
        busy={confirmar.isPending}
        onConfirm={() => confirmar.mutate(undefined, { onSettled: () => setConfirmOpen(false) })}
      />
      <ConfirmDialog
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        title="Aceptar resurtido"
        description={`Producción toma el resurtido ${folio}. Lo que tiene BOM pasa a almacén para validar materiales; lo de compra pasa directo a compras.`}
        confirmText="Aceptar"
        confirmColor="green"
        closeOnConfirm={false}
        busy={aceptar.isPending}
        onConfirm={() => aceptar.mutate(undefined, { onSettled: () => setAcceptOpen(false) })}
      />
      <PreOrderRejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        folio={folio}
        isPending={rechazar.isPending}
        onSubmit={(motivo) => rechazar.mutate(motivo, { onSuccess: () => setRejectOpen(false) })}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar pre-orden"
        description={
          isPreOrderOpCancelled(data.estatus, data.op_estatus)
            ? `Su OP ${data.op_folio || `#${data.op}`} ya está cancelada. Al cancelar la pre-orden ${folio} se puede generar otra. Esta acción no se puede deshacer.`
            : `La pre-orden ${folio} dejará de avanzar. Esta acción no se puede deshacer.`
        }
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

/**
 * Estado del material en palabras: cubierto, ya pedido en una OC en borrador
 * (falta autorizarla) o cuánto falta pedir de verdad.
 */
function MaterialEstado({
  falta,
  enBorrador,
  unidad,
  surtido,
}: {
  falta: number;
  enBorrador: number;
  unidad: string | null;
  /** La pre-orden ya es OP: el material se surtió, se ignora el faltante de hoy. */
  surtido?: boolean;
}) {
  const u = unidad ? ` ${unidad}` : "";
  if (surtido) {
    return (
      <span
        className="inline-flex rounded-full bg-sky-50 dark:bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300 whitespace-nowrap"
        title="El material se surtió y la OP ya lo tomó"
      >
        Surtido a la OP
      </span>
    );
  }
  const sinPedir = Math.max(0, falta - enBorrador);
  if (falta <= 0) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        Cubierto
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-end gap-1">
      {enBorrador > 0 && (
        <span
          className="inline-flex rounded-full bg-amber-50 dark:bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300"
          title="Ya está en una OC en borrador: falta que Compras la autorice"
        >
          Pedido · OC en borrador{sinPedir > 0 ? ` (${formatQuantityValue(enBorrador)}${u})` : ""}
        </span>
      )}
      {sinPedir > 0 && (
        <span className="inline-flex rounded-full bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
          Falta pedir {formatQuantityValue(sinPedir)}{u}
        </span>
      )}
    </span>
  );
}
