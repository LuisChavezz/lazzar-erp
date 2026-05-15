"use client";

import { CheckIcon, HistoryIcon, ClipboardListIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type { NewDevelopment, FlowStatus, FlowEventRecord } from "../interfaces/cedicor-new-development.interface";
import { FLOW_STEPS, FLOW_STATUS_LABELS } from "../interfaces/cedicor-new-development.interface";

// ── Configuración visual por estatus del flujo ────────────────────────────────

const ESTATUS_CFG: Record<
  FlowStatus,
  { badgeCls: string; dotCls: string }
> = {
  solicitud_recibida:    { badgeCls: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',        dotCls: 'bg-slate-400' },
  ordenes_generadas:     { badgeCls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',             dotCls: 'bg-blue-500' },
  op_enviada_areas:      { badgeCls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',     dotCls: 'bg-indigo-500' },
  validacion_materiales: { badgeCls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',         dotCls: 'bg-amber-500' },
  preficha_muestra:      { badgeCls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',     dotCls: 'bg-violet-500' },
  muestra_validada:      { badgeCls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',                 dotCls: 'bg-sky-500' },
  material_liberado:     { badgeCls: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',             dotCls: 'bg-teal-500' },
  en_corte:              { badgeCls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',     dotCls: 'bg-orange-500' },
  consumo_capturado:     { badgeCls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',             dotCls: 'bg-cyan-500' },
  despachado_confeccion: { badgeCls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', dotCls: 'bg-emerald-500' },
  material_faltante:     { badgeCls: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',    dotCls: 'bg-orange-500' },
  cancelado:             { badgeCls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',                 dotCls: 'bg-red-500' },
};

// ── Tipos internos para el timeline ──────────────────────────────────────────

interface TimelineStep {
  /** Número de paso canónico (1-10) */
  paso: number;
  /** Estatus que aplica en este punto del flujo */
  estatus: FlowStatus;
  /** El paso ya fue completado */
  completado: boolean;
  /** Es el paso activo actual */
  esCurrent: boolean;
  /** Datos del evento si existe en historial */
  evento?: FlowEventRecord;
}

/**
 * Construye la lista de pasos del timeline combinando los 10 pasos
 * canónicos con los eventos reales del historial.
 */
function buildTimelineSteps(order: NewDevelopment): TimelineStep[] {
  const { historial, paso_actual, estatus } = order;
  const esCancelado = estatus === 'cancelado';
  const esBloqueado = estatus === 'material_faltante';

  return FLOW_STEPS.map((stepKey, idx) => {
    const numeroPaso = idx + 1;
    const eventoReal = historial.find((e) => e.paso === numeroPaso);

    const completado = numeroPaso < paso_actual || estatus === 'despachado_confeccion';
    const esCurrent  = numeroPaso === paso_actual;

    // Para pasos completados antes del actual se usa el estatus canónico del flujo
    const estatusPaso: FlowStatus =
      eventoReal?.estatus ??
      (esCurrent && (esCancelado || esBloqueado) ? estatus : stepKey);

    return { paso: numeroPaso, estatus: estatusPaso, completado, esCurrent, evento: eventoReal };
  });
}

// ── Sub-componentes del timeline ──────────────────────────────────────────────

interface TimelineItemProps {
  step: TimelineStep;
  isLast: boolean;
}

function TimelineItem({ step, isLast }: TimelineItemProps) {
  const esCancelado = step.estatus === 'cancelado';
  const esBloqueado = step.estatus === 'material_faltante';
  const cfg = ESTATUS_CFG[step.estatus];

  return (
    <div className="flex gap-3 relative">
      {/* Línea vertical conectora */}
      {!isLast && (
        <div className="absolute left-3.5 top-7 w-px h-full bg-slate-200 dark:bg-white/10" />
      )}

      {/* Indicador de estado */}
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 mt-0.5">
        {esCancelado && step.esCurrent ? (
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-sm">
            <span className="text-white text-[10px] font-bold leading-none">✕</span>
          </div>
        ) : esBloqueado && step.esCurrent ? (
          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-[0_0_0_4px_rgba(245,158,11,0.2)]">
            <span className="text-white text-[10px] font-bold leading-none">!</span>
          </div>
        ) : step.completado ? (
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
            <CheckIcon className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        ) : step.esCurrent ? (
          <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center shadow-[0_0_0_4px_rgba(14,165,233,0.2)]">
            <ClipboardListIcon className="w-3 h-3 text-white" strokeWidth={2.5} />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-zinc-900 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
        )}
      </div>

      {/* Contenido del paso */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            {/* Número de paso + badge de estatus */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Paso {step.paso}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badgeCls}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotCls}`} aria-hidden="true" />
                {FLOW_STATUS_LABELS[step.estatus]}
              </span>
            </div>

            {/* Notas del evento si existen */}
            {step.evento?.notas && (step.completado || step.esCurrent) && (
              <p
                className={`text-sm leading-snug ${
                  esCancelado && step.esCurrent
                    ? 'text-red-600 dark:text-red-400 font-medium'
                    : esBloqueado && step.esCurrent
                      ? 'text-amber-700 dark:text-amber-300 font-medium'
                      : step.completado
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {step.evento.notas}
              </p>
            )}

            {/* Para pasos futuros, mostrar texto apagado */}
            {!step.completado && !step.esCurrent && (
              <p className="text-xs text-slate-400 dark:text-slate-600 italic">Pendiente</p>
            )}
          </div>

          {/* Fecha y responsable — solo para pasos ejecutados */}
          {step.evento && (step.completado || step.esCurrent) && (
            <div className="text-right shrink-0">
              <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {new Date(step.evento.fecha).toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {step.evento.responsable}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface CedicorNewDevelopmentTimelineDialogProps {
  order: NewDevelopment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CedicorNewDevelopmentTimelineDialog({
  order,
  open,
  onOpenChange,
}: CedicorNewDevelopmentTimelineDialogProps) {
  const steps     = buildTimelineSteps(order);
  const estatusCfg = ESTATUS_CFG[order.estatus];
  const esCancelado = order.estatus === 'cancelado';
  const esBloqueado = order.estatus === 'material_faltante';
  const esCompleto  = order.estatus === 'despachado_confeccion';

  return (
    <MainDialog
      title={
        <DialogHeader
          title={`Seguimiento — ${order.folio}`}
          subtitle={`${order.cliente} · ${order.nombre_producto}`}
          statusColor={esCancelado ? 'rose' : esBloqueado ? 'amber' : esCompleto ? 'emerald' : 'sky'}
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="600px"
    >
      <div className="space-y-4 mt-1">

        {/* ── Estatus actual ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5">
          <div className={`p-2 rounded-lg shrink-0 ${
            esCancelado ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
              : esBloqueado ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500'
              : esCompleto  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'
              : 'bg-sky-50 dark:bg-sky-500/10 text-sky-500'
          }`}>
            <HistoryIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Estatus actual
            </p>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mt-0.5 ${estatusCfg.badgeCls}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${estatusCfg.dotCls}`} aria-hidden="true" />
              {FLOW_STATUS_LABELS[order.estatus]}
            </span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400 dark:text-slate-500">Responsable</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {order.responsable_actual}
            </p>
          </div>
        </div>

        {/* ── Datos clave ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Progreso
            </p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight tabular-nums">
              {esCompleto ? '10 / 10' : `${order.paso_actual} / ${FLOW_STEPS.length}`}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">pasos</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Piezas
            </p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight tabular-nums">
              {order.cantidad_total.toLocaleString('es-MX')}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">total</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/3 border border-slate-100 dark:border-white/5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              Est. Entrega
            </p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              {order.fecha_estimada_entrega
                ? new Date(order.fecha_estimada_entrega).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                  })
                : '—'}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">fecha</p>
          </div>
        </div>

        {/* Clave de estilo + temporada */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
            {order.clave_estilo}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
            {order.temporada}
          </span>
        </div>

        <hr className="border-slate-100 dark:border-white/5" />

        {/* ── Timeline del proceso ─────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
            Historial del Proceso
          </p>
          <div>
            {steps.map((step, idx) => (
              <TimelineItem
                key={step.paso}
                step={step}
                isLast={idx === steps.length - 1}
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

