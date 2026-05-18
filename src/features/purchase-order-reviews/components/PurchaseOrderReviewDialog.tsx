"use client";

import {
  CheckIcon,
  HistoryIcon,
  ClipboardListIcon,
  ComprasIcon,
  PackageCheckIcon,
  ReceiptIcon,
  ErrorIcon,
} from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type {
  PurchaseOrderReview,
  ReviewStatus,
  ReviewEventRecord,
} from "../interfaces/purchase-order-review.interface";
import {
  REVIEW_STEPS,
  REVIEW_STATUS_LABELS,
  TIPO_COMPRA_LABELS,
} from "../interfaces/purchase-order-review.interface";

// ── Configuración visual del timeline ────────────────────────────────────────

const ESTATUS_CFG: Record<ReviewStatus, { badgeCls: string; dotCls: string }> = {
  solicitud_generada:     { badgeCls: 'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',         dotCls: 'bg-slate-400' },
  oc_creada:              { badgeCls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',                 dotCls: 'bg-sky-500' },
  esperando_confirmacion: { badgeCls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',         dotCls: 'bg-amber-400' },
  en_seguimiento:         { badgeCls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',     dotCls: 'bg-indigo-500' },
  contando_registrando:   { badgeCls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',     dotCls: 'bg-violet-500' },
  recepcion_confirmada:   { badgeCls: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',             dotCls: 'bg-teal-500' },
  factura_subida:         { badgeCls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',             dotCls: 'bg-cyan-500' },
  cxp_revisado:           { badgeCls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',     dotCls: 'bg-orange-400' },
  completado:             { badgeCls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', dotCls: 'bg-emerald-500' },
  no_recontactar:         { badgeCls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',                 dotCls: 'bg-red-500' },
  material_no_recibido:   { badgeCls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',     dotCls: 'bg-orange-500' },
  cancelado:              { badgeCls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400',             dotCls: 'bg-zinc-400' },
};

// Ícono representativo de cada paso del flujo (8 pasos)
const PASO_ICON: Record<number, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  1: ComprasIcon,
  2: ClipboardListIcon,
  3: ClipboardListIcon,
  4: HistoryIcon,
  5: PackageCheckIcon,
  6: PackageCheckIcon,
  7: ReceiptIcon,
  8: ReceiptIcon,
};

// ── Estructura interna del timeline ──────────────────────────────────────────

interface TimelineStep {
  paso:       number;
  label:      string;
  estatus:    ReviewStatus;
  completado: boolean;
  esCurrent:  boolean;
  esEspecial: boolean;   // no_recontactar o cancelado
  evento?:    ReviewEventRecord;
}

/** Construye la lista ordenada de pasos para el timeline */
function buildSteps(review: PurchaseOrderReview): TimelineStep[] {
  const { historial, paso_actual, estatus } = review;
  const esCancelado      = estatus === 'cancelado';
  const esNoRec           = estatus === 'no_recontactar';
  const esMaterialNoRec   = estatus === 'material_no_recibido';
  const esCompletado      = estatus === 'completado';

  const pasos: TimelineStep[] = REVIEW_STEPS.map((stepKey, idx) => {
    const numeroPaso = idx + 1;
    const evento     = historial.find((e) => e.paso === numeroPaso);
    const completado = numeroPaso < paso_actual || esCompletado;
    const esCurrent  = numeroPaso === paso_actual && !esCancelado && !esNoRec && !esMaterialNoRec && !esCompletado;

    return {
      paso:       numeroPaso,
      label:      REVIEW_STATUS_LABELS[stepKey],
      estatus:    evento?.estatus ?? stepKey,
      completado,
      esCurrent,
      esEspecial: false,
      evento,
    };
  });

  // Agregar paso especial al final si aplica
  if (esCancelado) {
    const eventoCancel = historial.find((e) => e.estatus === 'cancelado');
    pasos.push({
      paso:       paso_actual,
      label:      REVIEW_STATUS_LABELS['cancelado'],
      estatus:    'cancelado',
      completado: false,
      esCurrent:  true,
      esEspecial: true,
      evento:     eventoCancel,
    });
  } else if (esNoRec) {
    const eventoNoRec = historial.find((e) => e.estatus === 'no_recontactar');
    pasos.push({
      paso:       3,
      label:      REVIEW_STATUS_LABELS['no_recontactar'],
      estatus:    'no_recontactar',
      completado: false,
      esCurrent:  true,
      esEspecial: true,
      evento:     eventoNoRec,
    });
  } else if (esMaterialNoRec) {
    const eventoMat = historial.find((e) => e.estatus === 'material_no_recibido');
    pasos.push({
      paso:       4,
      label:      REVIEW_STATUS_LABELS['material_no_recibido'],
      estatus:    'material_no_recibido',
      completado: false,
      esCurrent:  true,
      esEspecial: true,
      evento:     eventoMat,
    });
  } else if (esCompletado) {
    const eventoFin = historial.find((e) => e.estatus === 'completado');
    pasos.push({
      paso:       REVIEW_STEPS.length + 1,
      label:      'Revisión Completada',
      estatus:    'completado',
      completado: true,
      esCurrent:  false,
      esEspecial: false,
      evento:     eventoFin,
    });
  }

  return pasos;
}

// ── Ítem del timeline ─────────────────────────────────────────────────────────

interface TimelineItemProps {
  step:   TimelineStep;
  isLast: boolean;
}

function TimelineItem({ step, isLast }: TimelineItemProps) {
  const cfg = ESTATUS_CFG[step.estatus];
  const StepIcon = PASO_ICON[step.paso] ?? ClipboardListIcon;

  return (
    <div className="flex gap-3 relative">
      {/* Línea vertical conectora */}
      {!isLast && (
        <div className="absolute left-3.5 top-7 w-px h-full bg-slate-200 dark:bg-white/10" />
      )}

      {/* Indicador de estado */}
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 mt-0.5">
        {step.completado ? (
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
            <CheckIcon className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          </div>
        ) : step.esCurrent ? (
          <div className={`w-7 h-7 rounded-full ${cfg.dotCls} flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-zinc-900 ring-offset-1`}>
            <StepIcon className="w-3.5 h-3.5 text-white" />
          </div>
        ) : step.esEspecial ? (
          <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shadow-sm">
            <ErrorIcon className="w-3.5 h-3.5 text-white" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <StepIcon className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          </div>
        )}
      </div>

      {/* Contenido del paso */}
      <div className="flex-1 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className={`text-xs font-semibold leading-tight ${
              step.completado
                ? 'text-slate-700 dark:text-slate-200'
                : step.esCurrent
                ? 'text-slate-800 dark:text-white font-bold'
                : 'text-slate-400 dark:text-slate-500'
            }`}>
              {step.paso <= REVIEW_STEPS.length ? `Paso ${step.paso} · ` : ''}{step.label}
            </p>
            {step.evento && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {new Date(step.evento.fecha).toLocaleString('es-MX', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })} · {step.evento.responsable}
              </p>
            )}
          </div>
          {(step.completado || step.esCurrent || step.esEspecial) && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badgeCls}`}>
              {REVIEW_STATUS_LABELS[step.estatus]}
            </span>
          )}
        </div>
        {step.evento?.notas && (
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 italic leading-relaxed border-l-2 border-slate-200 dark:border-white/10 pl-2">
            {step.evento.notas}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Panel de resumen de la revisión ──────────────────────────────────────────

function ResumenPanel({ review }: { review: PurchaseOrderReview }) {
  const { estatus } = review;
  const cfg = ESTATUS_CFG[estatus];

  const montoFmt = new Intl.NumberFormat('es-MX', {
    style:    'currency',
    currency: 'MXN',
  }).format(review.monto_total);

  return (
    <div className="grid grid-cols-2 gap-3 text-xs">
      {/* Estatus actual */}
      <div className="col-span-2 flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-white/5 px-4 py-3">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dotCls}`} aria-hidden="true" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estatus actual</p>
          <p className={`text-sm font-semibold mt-0.5 ${cfg.badgeCls.split(' ').filter((c) => c.startsWith('text-')).join(' ')}`}>
            {REVIEW_STATUS_LABELS[estatus]}
          </p>
        </div>
      </div>

      {/* OC Referencia */}
      <div className="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">OC Referencia</p>
        <p className="font-mono font-semibold text-slate-700 dark:text-slate-200">{review.oc_referencia}</p>
      </div>

      {/* Tipo de compra */}
      <div className="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Tipo de compra</p>
        <p className="font-semibold text-slate-700 dark:text-slate-200">{TIPO_COMPRA_LABELS[review.tipo_compra]}</p>
      </div>

      {/* Proveedor */}
      <div className="col-span-2 rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Proveedor</p>
        <p className="font-semibold text-slate-700 dark:text-slate-200 leading-snug">{review.proveedor}</p>
        <p className="font-mono text-slate-400">{review.rfc_proveedor}</p>
      </div>

      {/* Monto */}
      <div className="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Monto total</p>
        <p className="font-bold font-mono text-slate-700 dark:text-slate-200">{montoFmt}</p>
        <p className="text-[10px] font-semibold mt-0.5 text-slate-400">MXN</p>
      </div>

      {/* Folio R.T. */}
      <div className="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Folio R.T.</p>
        <p className={`font-mono font-semibold ${review.folio_rt ? 'text-teal-600 dark:text-teal-400' : 'text-slate-300 dark:text-slate-600'}`}>
          {review.folio_rt ?? '— Pendiente —'}
        </p>
      </div>

      {/* Nota de crédito */}
      {review.tiene_nota_credito && review.nota_credito_monto && (
        <div className="col-span-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-0.5">Nota de crédito aplicada</p>
          <p className="font-bold font-mono text-amber-700 dark:text-amber-300">
            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(review.nota_credito_monto)}
          </p>
        </div>
      )}

      {/* Responsables */}
      <div className="col-span-2 rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Responsables</p>
        <div className="space-y-1">
          {[
            { label: 'Compras',  value: review.responsable_compras },
            { label: 'Almacén',  value: review.responsable_almacen },
            { label: 'CxP',      value: review.responsable_cxp },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-slate-400">{label}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fechas */}
      <div className="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">F. Solicitud</p>
        <p className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
          {new Date(review.fecha_solicitud).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">F. Est. Entrega</p>
        <p className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
          {new Date(review.fecha_estimada_entrega).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Observaciones */}
      {review.observaciones && review.observaciones !== 'Sin observaciones.' && (
        <div className="col-span-2 rounded-lg bg-slate-50 dark:bg-white/5 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Observaciones</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic">{review.observaciones}</p>
        </div>
      )}
    </div>
  );
}

// ── Componente principal del dialog ──────────────────────────────────────────

interface PurchaseOrderReviewDialogProps {
  review:        PurchaseOrderReview;
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
}

export function PurchaseOrderReviewDialog({
  review,
  open,
  onOpenChange,
}: PurchaseOrderReviewDialogProps) {
  const steps = buildSteps(review);
  const cfg   = ESTATUS_CFG[review.estatus];

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="860px"
      showCloseButton
      title={
        <DialogHeader
          title={`Revisión de pedido ${review.folio}`}
          subtitle={review.oc_referencia}
          statusColor="sky"
        />
      }
    >
      {/* ── Banner de estatus destacado ─────────────────────────────── */}
      <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 ${cfg.badgeCls}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotCls}`} aria-hidden="true" />
        <span className="text-xs font-bold">{REVIEW_STATUS_LABELS[review.estatus]}</span>
        <span className="mx-2 text-current opacity-30">·</span>
        <span className="text-xs opacity-75">{review.proveedor}</span>
      </div>

      {/* ── Layout de dos columnas: resumen + timeline ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

        {/* Columna izquierda — resumen de la revisión */}
        <div className="md:col-span-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <ClipboardListIcon className="w-3.5 h-3.5" />
            Detalle de la revisión
          </h3>
          <ResumenPanel review={review} />
        </div>

        {/* Columna derecha — timeline de historial */}
        <div className="md:col-span-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <HistoryIcon className="w-3.5 h-3.5" />
            Historial del flujo
          </h3>
          <div className="relative">
            {steps.map((step, i) => (
              <TimelineItem key={`${step.estatus}-${i}`} step={step} isLast={i === steps.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </MainDialog>
  );
}
