"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "@/src/components/Icons";
import { EmptyLines } from "@/src/components/DetailDialogPrimitives";
import { ErrorState } from "@/src/components/ErrorState";
import { FormSelect } from "@/src/components/FormSelect";
import { StatusBadge } from "@/src/components/StatusBadge";
import { useClientNow } from "@/src/hooks/useClientNow";
import { formatCurrency, formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { getMexicoTodayDate, MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import { useSuppliers } from "@/src/features/suppliers/hooks/useSuppliers";
import { NEED_STATUS_CFG } from "@/src/features/pre-orders/components/PreOrderTracking";
import { useCreateOcFromNeeds, usePurchaseNeedGroups } from "../hooks/usePurchaseNeeds";
import { createdOcId } from "../services/actions";
import type { PurchaseNeedGroup } from "../utils/normalizeNeedGroup";

const LINK_CLASS =
  "font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 underline decoration-dotted underline-offset-4";

const fecha = (value: string | null | undefined) =>
  value ? formatShortDate(value, { timeZone: MEXICO_TIME_ZONE }) : "—";

/**
 * Días de calendario (México) que faltan para una fecha `YYYY-MM-DD`
 * (negativo = vencida). `null` durante el prerender (`useClientNow`).
 */
function daysUntil(value: string | null, now: number | null): number | null {
  if (!value || now === null) return null;
  const today = getMexicoTodayDate(new Date(now));
  const utc = (key: string) => Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
  return Math.round((utc(value.slice(0, 10)) - utc(today)) / 86_400_000);
}

/**
 * Necesidades de compra agrupadas por material: compras ve, por ejemplo,
 * "DRY OXFORD · 47 M en 6 pedidos, el más urgente para el 14 nov", elige
 * las necesidades, el proveedor y crea UNA orden de compra consolidada.
 * El reparto al recibir lo hace el backend (por fecha requerida).
 */
export function PurchaseNeedsView() {
  const router = useRouter();
  const now = useClientNow();
  const { groups, hasLoaded, isInitialError, refetch, isFetching } = usePurchaseNeedGroups();
  const { suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const create = useCreateOcFromNeeds();

  const [open, setOpen] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [proveedor, setProveedor] = useState("");

  // Solo las necesidades pendientes se pueden juntar en una OC nueva.
  const pendientes = (g: PurchaseNeedGroup) => g.necesidades.filter((n) => n.estatus === "pendiente");
  // El backend ya las manda de la más urgente a la menos urgente.
  const ordered = groups;
  const selectedGroups = ordered.filter((g) => pendientes(g).some((n) => selected.has(n.id)));
  const sugerido = selectedGroups.find((g) => g.proveedorHabitualId)?.proveedorHabitualId ?? null;
  const proveedorId = proveedor ? Number(proveedor) : sugerido;

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleNeeds = (ids: number[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const submit = () => {
    if (!proveedorId || selected.size === 0) return;
    create.mutate(
      { proveedor: proveedorId, necesidades: [...selected] },
      {
        onSuccess: (res) => {
          setSelected(new Set());
          setProveedor("");
          const ocId = createdOcId(res);
          if (ocId) router.push(`/procurement/purchase-orders/${ocId}`);
        },
      },
    );
  };

  if (!hasLoaded && !isInitialError) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }
  if (isInitialError) {
    return (
      <ErrorState
        title="No se pudieron cargar las necesidades"
        message="Recarga la página para intentar de nuevo."
      />
    );
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Lo que les falta a los pedidos especiales, juntado por material. Elige las necesidades y crea
          una sola orden de compra.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded-xl border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50"
        >
          {isFetching ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 p-8">
          <EmptyLines>No hay necesidades de compra. Aparecen cuando almacén confirma una pre-orden con faltantes.</EmptyLines>
        </div>
      ) : (
        <ul className="space-y-3">
          {ordered.map((g) => {
            const pend = pendientes(g);
            const pendIds = pend.map((n) => n.id);
            const allOn = pendIds.length > 0 && pendIds.every((id) => selected.has(id));
            const someOn = pendIds.some((id) => selected.has(id));
            const dias = daysUntil(g.fechaMasUrgente, now);
            const isOpen = open.has(g.key);
            return (
              <li
                key={g.key}
                className={`rounded-2xl border bg-white dark:bg-zinc-900 transition-colors ${
                  someOn ? "border-sky-300 dark:border-sky-500/40" : "border-slate-200 dark:border-white/5"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-sky-600 cursor-pointer"
                    aria-label={`Seleccionar las necesidades pendientes de ${g.nombre}`}
                    checked={allOn}
                    ref={(el) => {
                      if (el) el.indeterminate = someOn && !allOn;
                    }}
                    disabled={pendIds.length === 0}
                    onChange={(e) => toggleNeeds(pendIds, e.target.checked)}
                  />
                  <div className="min-w-48 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">{g.nombre}</p>
                    <p className="font-mono text-[11px] text-slate-400">{g.codigo ?? "—"}</p>
                  </div>
                  <Stat label="Total a pedir" strong>
                    {formatQuantityValue(g.total)} {g.unidad ?? ""}
                  </Stat>
                  <Stat label="Pedidos">{g.pedidos}</Stat>
                  <Stat label="Más urgente">
                    <span
                      className={
                        dias !== null && dias < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : dias !== null && dias <= 3
                            ? "text-amber-600 dark:text-amber-400"
                            : undefined
                      }
                    >
                      {fecha(g.fechaMasUrgente)}
                    </span>
                  </Stat>
                  <Stat label="Existencia">{g.existencia === null ? "—" : formatQuantityValue(g.existencia)}</Stat>
                  <Stat label="En camino">{g.enTransito === null ? "—" : formatQuantityValue(g.enTransito)}</Stat>
                  <Stat label="Proveedor habitual">
                    <span className="block max-w-40 truncate" title={g.proveedorHabitualNombre ?? undefined}>
                      {g.proveedorHabitualNombre ?? "—"}
                    </span>
                  </Stat>
                  <Stat label="Último costo">{g.ultimoCosto === null ? "—" : formatCurrency(g.ultimoCosto, "MXN")}</Stat>
                  <button
                    type="button"
                    onClick={() => toggleOpen(g.key)}
                    aria-expanded={isOpen}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  >
                    {isOpen ? "Ocultar" : `Ver ${g.necesidades.length}`}
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-white/5 px-5 py-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                          <th className="w-8 py-1.5" />
                          <th className="py-1.5 font-medium">Pedido</th>
                          <th className="py-1.5 font-medium">Requerida para</th>
                          <th className="py-1.5 font-medium text-right">Cantidad</th>
                          <th className="py-1.5 font-medium pl-4">Estatus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {g.necesidades.map((n) => {
                          const editable = n.estatus === "pendiente";
                          return (
                            <tr key={n.id}>
                              <td className="py-2">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-sky-600 cursor-pointer disabled:cursor-not-allowed"
                                  aria-label={`Seleccionar necesidad del pedido ${n.pedido_folio ?? n.id}`}
                                  checked={selected.has(n.id)}
                                  disabled={!editable}
                                  onChange={(e) => toggleNeeds([n.id], e.target.checked)}
                                />
                              </td>
                              <td className="py-2">
                                {n.pre_orden ? (
                                  <Link href={`/manufacturing/pre-orders/${n.pre_orden}`} className={LINK_CLASS}>
                                    {n.pedido_folio ?? `Pre-orden #${n.pre_orden}`}
                                  </Link>
                                ) : (
                                  <span className="font-mono text-xs">{n.pedido_folio ?? "—"}</span>
                                )}
                              </td>
                              <td className="py-2 tabular-nums text-slate-600 dark:text-slate-300">
                                {fecha(n.fecha_requerida)}
                              </td>
                              <td className="py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                                {formatQuantityValue(n.cantidad)} {n.unidad ?? g.unidad ?? ""}
                              </td>
                              <td className="py-2 pl-4">
                                <StatusBadge status={n.estatus ?? "pendiente"} config={NEED_STATUS_CFG} />
                                {n.orden_compra && (
                                  <Link
                                    href={`/procurement/purchase-orders/${n.orden_compra}`}
                                    className={`${LINK_CLASS} ml-2`}
                                  >
                                    {n.orden_compra_folio ?? `OC #${n.orden_compra}`}
                                  </Link>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Barra de acción: aparece al seleccionar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-4xl rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-lg px-5 py-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {selected.size} {selected.size === 1 ? "necesidad" : "necesidades"} de{" "}
                {selectedGroups.length} {selectedGroups.length === 1 ? "material" : "materiales"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Se crea una sola OC en borrador.</p>
            </div>
            <div className="w-64">
              <FormSelect
                label="Proveedor"
                name="proveedor"
                className="py-2!"
                value={proveedor || (sugerido ? String(sugerido) : "")}
                disabled={loadingSuppliers || create.isPending}
                onChange={(e) => setProveedor(e.target.value)}
              >
                <option value="" disabled>
                  Seleccionar proveedor…
                </option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                    {s.id === sugerido ? " (habitual)" : ""}
                  </option>
                ))}
              </FormSelect>
            </div>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={create.isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!proveedorId || create.isPending}
              className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {create.isPending ? "Creando…" : "Crear orden de compra"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, children, strong = false }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p
        className={`tabular-nums ${strong ? "text-base font-bold text-slate-900 dark:text-white" : "text-sm text-slate-700 dark:text-slate-200"}`}
      >
        {children}
      </p>
    </div>
  );
}
