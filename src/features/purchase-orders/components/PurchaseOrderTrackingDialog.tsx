"use client";

import { MapPinIcon, EmbarquesIcon, CheckIcon, ClockIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type { PurchaseOrder, TrackingEvento } from "../interfaces/purchase-order.interface";

// Configuración visual por estado del ciclo de vida
const LIFECYCLE_CFG: Record<
  string,
  { label: string; badgeCls: string; dotCls: string }
> = {
  borrador: {
    label: "Borrador",
    badgeCls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dotCls: "bg-slate-400",
  },
  pendiente: {
    label: "Pendiente autorización",
    badgeCls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dotCls: "bg-amber-400",
  },
  autorizada: {
    label: "Autorizada",
    badgeCls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dotCls: "bg-sky-500",
  },
  en_transito: {
    label: "En tránsito",
    badgeCls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
    dotCls: "bg-indigo-500",
  },
  en_aduana: {
    label: "En aduana",
    badgeCls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    dotCls: "bg-orange-400",
  },
  en_camino_almacen: {
    label: "En camino al almacén",
    badgeCls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    dotCls: "bg-violet-500",
  },
  recibida: {
    label: "Recibida en almacén",
    badgeCls: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
    dotCls: "bg-teal-500",
  },
  completada: {
    label: "Completada",
    badgeCls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dotCls: "bg-emerald-500",
  },
  cancelada: {
    label: "Cancelada",
    badgeCls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dotCls: "bg-red-400",
  },
};

// ─── Subcomponentes del timeline ─────────────────────────────────────────────

interface TimelineItemProps {
  evento: TrackingEvento;
  isLast: boolean;
}

function TimelineItem({ evento, isLast }: TimelineItemProps) {
  return (
    <div className="flex gap-3 relative">
      {/* Línea vertical conectora */}
      {!isLast && (
        <div className="absolute left-3.5 top-6 w-px h-full bg-slate-200 dark:bg-white/10" />
      )}

      {/* Indicador de estado */}
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 mt-0.5">
        {evento.completado ? (
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        ) : evento.esCurrent ? (
          <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center shadow-[0_0_0_4px_rgba(14,165,233,0.2)]">
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-900 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
        )}
      </div>

      {/* Contenido del evento */}
      <div className="flex-1 pb-5">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p
            className={`text-sm font-medium leading-snug ${
              evento.completado
                ? "text-slate-700 dark:text-slate-200"
                : evento.esCurrent
                  ? "text-sky-700 dark:text-sky-300 font-semibold"
                  : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {evento.descripcion}
          </p>
          {(evento.completado || evento.esCurrent) && (
            <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
              {evento.fecha} · {evento.hora}
            </span>
          )}
        </div>
        <p
          className={`text-xs mt-0.5 flex items-center gap-1 ${
            evento.completado
              ? "text-slate-400 dark:text-slate-500"
              : evento.esCurrent
                ? "text-sky-600 dark:text-sky-400"
                : "text-slate-300 dark:text-slate-600"
          }`}
        >
          <MapPinIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
          {evento.ubicacion}
        </p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface PurchaseOrderTrackingDialogProps {
  order: PurchaseOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseOrderTrackingDialog({
  order,
  open,
  onOpenChange,
}: PurchaseOrderTrackingDialogProps) {
  const tracking = order.tracking;
  const lifecycleCfg =
    order.lifecycle_status ? (LIFECYCLE_CFG[order.lifecycle_status] ?? null) : null;

  return (
    <MainDialog
      title={
        <DialogHeader
          title={`Rastreo — ${order.folio}`}
          subtitle={order.proveedor_nombre ?? `Proveedor #${order.proveedor}`}
          statusColor="sky"
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="560px"
    >
      <div className="space-y-4 mt-1">
        {/* Badge del estado de ciclo de vida */}
        {lifecycleCfg && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${lifecycleCfg.badgeCls}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${lifecycleCfg.dotCls}`}
                aria-hidden="true"
              />
              {lifecycleCfg.label}
            </span>
          </div>
        )}

        {tracking ? (
          <>
            {/* Tarjetas de información de envío */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: "N° Guía", value: tracking.numero_guia, mono: true },
                { label: "Transportista", value: tracking.transportista, mono: false },
                { label: "Origen", value: tracking.origen, mono: false },
                { label: "Destino", value: tracking.destino, mono: false },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-slate-50 dark:bg-white/3 rounded-xl p-3 border border-slate-100 dark:border-white/5"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {card.label}
                  </p>
                  <p
                    className={`text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight ${card.mono ? "font-mono" : ""}`}
                  >
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            {/* ETA destacada */}
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20">
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center shrink-0">
                <EmbarquesIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">
                  Fecha estimada de llegada
                </p>
                <p className="text-sm font-bold text-sky-700 dark:text-sky-300">
                  {tracking.fecha_estimada_llegada}
                </p>
              </div>
            </div>

            {/* Separador */}
            <div className="flex items-center gap-2 pt-1">
              <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Historial de eventos
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            </div>

            {/* Timeline de eventos */}
            <div className="pl-1">
              {tracking.eventos.map((evento, idx) => (
                <TimelineItem
                  key={idx}
                  evento={evento}
                  isLast={idx === tracking.eventos.length - 1}
                />
              ))}
            </div>
          </>
        ) : (
          /* Estado sin tracking disponible */
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Sin información de rastreo
              </p>
              <p className="text-xs text-slate-400 mt-1">
                El rastreo estará disponible cuando el proveedor confirme el envío.
              </p>
            </div>
          </div>
        )}
      </div>
    </MainDialog>
  );
}
