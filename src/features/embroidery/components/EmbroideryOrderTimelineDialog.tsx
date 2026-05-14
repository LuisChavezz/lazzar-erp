"use client";

import { CheckIcon, ClockIcon, ScissorsIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type { EmbroideryOrder, EstatusHojaBordado, EmbroideryStatusEvent } from "../interfaces/embroidery-order.interface";

// Configuración visual por etapa del proceso de bordado
const ESTATUS_CFG: Record<
  EstatusHojaBordado,
  { label: string; descripcion: string; badgeCls: string; dotCls: string }
> = {
  sin_liberar: {
    label: 'Sin Liberar',
    descripcion: 'Orden recibida en área de bordado. Pendiente revisión de muestra y cuadre.',
    badgeCls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
    dotCls: 'bg-slate-400',
  },
  liberada: {
    label: 'Liberada',
    descripcion: 'Muestra aprobada. Cuadre de prendas completado. Lista para producción.',
    badgeCls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
    dotCls: 'bg-indigo-500',
  },
  en_proceso: {
    label: 'En Proceso',
    descripcion: 'Bordado en curso. Prendas asignadas a bordadora según nivel de rack.',
    badgeCls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    dotCls: 'bg-orange-400',
  },
  terminada: {
    label: 'Terminada',
    descripcion: 'Bordado concluido. Prendas entregadas al área de deshebrado.',
    badgeCls: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
    dotCls: 'bg-teal-500',
  },
};

// Mapa de etiquetas para clasificación de pedido
const CLASIFICACION_LABEL: Record<string, string> = {
  clasificacion_b: 'Clasificación B',
  ponchado_arreglo: 'Ponchado / Arreglo',
  externo: 'Externo',
  serigrafia: 'Serigrafía',
};

// Mapa de etiquetas para nivel de rack
const NIVEL_RACK_LABEL: Record<string, string> = {
  superior: 'Nivel Superior (2 cabezas)',
  medio: 'Nivel Medio (4 cabezas)',
  inferior: 'Nivel Inferior (6 cabezas)',
};

// ─── Subcomponentes del timeline ─────────────────────────────────────────────

interface TimelineItemProps {
  evento: EmbroideryStatusEvent;
  isLast: boolean;
}

function TimelineItem({ evento, isLast }: TimelineItemProps) {
  const cfg = ESTATUS_CFG[evento.estatus];

  return (
    <div className="flex gap-3 relative">
      {/* Línea vertical conectora */}
      {!isLast && (
        <div className="absolute left-3.5 top-7 w-px h-full bg-slate-200 dark:bg-white/10" />
      )}

      {/* Indicador de estado */}
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 mt-0.5">
        {evento.completado ? (
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
            <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        ) : evento.esCurrent ? (
          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shadow-[0_0_0_4px_rgba(249,115,22,0.2)]">
            <ScissorsIcon className="w-3 h-3 text-white" strokeWidth={2.5} />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-900 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
        )}
      </div>

      {/* Contenido del evento */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${cfg.badgeCls}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotCls}`} aria-hidden="true" />
              {cfg.label}
            </span>
            <p
              className={`text-sm leading-snug ${
                evento.completado
                  ? 'text-slate-700 dark:text-slate-200'
                  : evento.esCurrent
                    ? 'text-orange-700 dark:text-orange-300 font-medium'
                    : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {cfg.descripcion}
            </p>
            {evento.nota && (evento.completado || evento.esCurrent) && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">
                {evento.nota}
              </p>
            )}
          </div>
          {(evento.completado || evento.esCurrent) && evento.fecha && (
            <div className="text-right shrink-0">
              <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {new Date(evento.fecha + 'T00:00:00').toLocaleDateString('es-MX')}
              </p>
              <p className="text-xs tabular-nums text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {evento.hora} — {evento.usuario}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface EmbroideryOrderTimelineDialogProps {
  order: EmbroideryOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmbroideryOrderTimelineDialog({
  order,
  open,
  onOpenChange,
}: EmbroideryOrderTimelineDialogProps) {
  const estatusCfg = ESTATUS_CFG[order.estatus_hoja];

  return (
    <MainDialog
      title={
        <DialogHeader
          title={`Seguimiento — ${order.numero_orden}`}
          subtitle={order.pedido + ' · ' + order.cliente}
          statusColor="amber"
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="560px"
    >
      <div className="space-y-4 mt-1">

        {/* Badge del estatus actual */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5">
          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500 shrink-0">
            <ScissorsIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Estatus actual
            </p>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mt-0.5 ${estatusCfg.badgeCls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${estatusCfg.dotCls}`} aria-hidden="true" />
              {estatusCfg.label}
            </span>
          </div>
          {order.numero_bordadora && (
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400 dark:text-slate-500">Bordadora</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {order.numero_bordadora}
              </p>
            </div>
          )}
        </div>

        {/* Datos clave: Surtido + Fin de bordado + Fecha entrega a deshebrado (Paso 3) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Surtido
            </p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              {order.tipo_surtido === 'completa' ? 'Completo' : 'Parcial'}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              {order.total_prendas_recibidas} prendas
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Fin Bordado
            </p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              {order.fin_bordado_estimado
                ? new Date(order.fin_bordado_estimado + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                : '—'}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">estimado</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              A Deshebrado
            </p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              {order.fecha_entrega_deshebrado
                ? new Date(order.fecha_entrega_deshebrado + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                : '—'}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">entrega</p>
          </div>
        </div>

        {/* Info de clasificación y rack */}
        {(order.clasificacion_pedido || order.rack_slot) && (
          <div className="flex items-center gap-3 flex-wrap">
            {order.clasificacion_pedido && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                {CLASIFICACION_LABEL[order.clasificacion_pedido]}
              </span>
            )}
            {order.rack_slot && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
                <ClockIcon className="w-3 h-3" aria-hidden="true" />
                {NIVEL_RACK_LABEL[order.rack_slot.nivel]} · pos. {order.rack_slot.posicion}
              </span>
            )}
          </div>
        )}

        {/* Separador */}
        <hr className="border-slate-100 dark:border-white/5" />

        {/* Timeline del proceso */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
            Historial del Proceso
          </p>
          <div>
            {order.historial_estatus.map((evento, idx) => (
              <TimelineItem
                key={evento.estatus}
                evento={evento}
                isLast={idx === order.historial_estatus.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Observaciones */}
        {order.observaciones && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
              Observaciones
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {order.observaciones}
            </p>
          </div>
        )}
      </div>
    </MainDialog>
  );
}
