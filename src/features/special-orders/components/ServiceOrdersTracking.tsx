"use client";

import Link from "next/link";
import { ScissorsIcon } from "@/src/components/Icons";
import { StepTracker, StepTrackerMini } from "@/src/components/StepTracker";
import { SheetSection } from "@/src/features/orders/components/OrderSheetPrimitives";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import { formatShortDate } from "@/src/utils/formatDate";
import { SERVICE_KEYS, SERVICE_STEPS, serviceProgress, type ServiceKey } from "../constants/serviceSteps";
import type { ServiceOrderRef, SpecialOrderListItem } from "../interfaces/special-order.interface";

/** "Con quién está": maquilero (bordado) u operador. */
const withWhom = (o: ServiceOrderRef) => o.proveedor || o.asignado || null;

/** Texto corto del estado: "Ponchado · Jesús Ibarra". */
function shortText(o: ServiceOrderRef) {
  const who = withWhom(o);
  return who ? `${o.estatus_display} · ${who}` : o.estatus_display;
}

/** Servicios que el pedido lleva o que ya tienen orden. */
function activeServices(order: SpecialOrderListItem) {
  return SERVICE_KEYS.map((key) => ({
    key,
    orders: order.ordenes_servicio?.[key] ?? [],
    required: Boolean(order.servicios?.[key]),
  })).filter((s) => s.orders.length > 0 || s.required);
}

/** Columna "Servicios" del listado: un mini tracker por orden. */
export function ServiciosCell({ order }: { order: SpecialOrderListItem }) {
  if (order.ordenes_servicio === undefined) return <span className="text-slate-400">—</span>;
  const services = activeServices(order);
  if (services.length === 0) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">Sin servicios</span>;
  }
  return (
    <div className="flex flex-col gap-2">
      {services.map(({ key, orders }) =>
        orders.length === 0 ? (
          <span key={key} className="text-xs text-slate-500 dark:text-slate-400">
            {SERVICE_STEPS[key].label}: <span className="text-slate-400">sin orden</span>
          </span>
        ) : (
          orders.map((o) => {
            const { current, state } = serviceProgress(key, o.estatus, o.estatus_previo);
            return (
              <Link
                key={o.id}
                href={SERVICE_STEPS[key].href(o.id)}
                title={`${SERVICE_STEPS[key].label} ${o.folio} · ${shortText(o)}`}
                className="inline-flex flex-col hover:opacity-80"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {SERVICE_STEPS[key].label}
                </span>
                <StepTrackerMini
                  steps={SERVICE_STEPS[key].steps}
                  current={current}
                  state={state}
                  text={o.estatus_display}
                />
              </Link>
            );
          })
        ),
      )}
    </div>
  );
}

function ServiceOrderRow({ serviceKey, order }: { serviceKey: ServiceKey; order: ServiceOrderRef }) {
  const cfg = SERVICE_STEPS[serviceKey];
  const { current, state } = serviceProgress(serviceKey, order.estatus, order.estatus_previo);
  const who = withWhom(order);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{cfg.label}</span>
          <Link
            href={cfg.href(order.id)}
            title="Ver orden"
            className="text-sm font-medium tabular-nums text-sky-600 dark:text-sky-400 hover:underline"
          >
            {order.folio}
          </Link>
          {state !== "normal" && (
            <span
              className={`text-xs font-semibold ${
                state === "halted" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
              }`}
            >
              {order.estatus_display}
              {state === "halted" && order.estatus_previo_display
                ? ` en ${order.estatus_previo_display}`
                : ""}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {order.proveedor ? "Maquilero" : "Asignado"}:{" "}
            <span className="font-medium text-slate-700 dark:text-slate-200">{who ?? "Sin asignar"}</span>
          </span>
          {order.fecha_compromiso && (
            <span>
              Compromiso:{" "}
              <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">
                {formatShortDate(order.fecha_compromiso, { timeZone: MEXICO_TIME_ZONE })}
              </span>
            </span>
          )}
        </div>
      </div>
      <StepTracker
        steps={cfg.steps}
        current={current}
        state={state}
        label={`Seguimiento de ${cfg.label.toLowerCase()} ${order.folio}`}
      />
    </div>
  );
}

/** Sección "Servicios" del detalle: un tracker por cada orden de servicio. */
export function ServiceOrdersSection({ order }: { order: SpecialOrderListItem }) {
  if (order.ordenes_servicio === undefined) return null;
  const services = activeServices(order);
  if (services.length === 0) return null;
  return (
    <SheetSection
      icon={<ScissorsIcon className="w-5 h-5" />}
      title="Servicios"
      subtitle="Bordado, reflejante y corte de manga del pedido."
    >
      <div className="space-y-3">
        {services.map(({ key, orders }) =>
          orders.length === 0 ? (
            <div
              key={key}
              className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 px-4 py-3 text-sm text-slate-500 dark:text-slate-400"
            >
              <span className="font-semibold text-slate-700 dark:text-slate-200">{SERVICE_STEPS[key].label}</span>
              : aún sin orden.
            </div>
          ) : (
            orders.map((o) => <ServiceOrderRow key={o.id} serviceKey={key} order={o} />)
          ),
        )}
      </div>
    </SheetSection>
  );
}
