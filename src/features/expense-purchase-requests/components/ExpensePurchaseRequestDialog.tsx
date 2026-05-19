"use client";

import {
  CheckIcon,
  HistoryIcon,
  ClipboardListIcon,
  ComprasIcon,
  PackageCheckIcon,
  ReceiptIcon,
  ErrorIcon,
  EmailIcon,
  TasksIcon,
  CxpIcon,
} from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type {
  ExpensePurchaseRequest,
  ExpenseRequestStatus,
  ExpenseRequestEventRecord,
  TipoGasto,
} from "../interfaces/expense-purchase-request.interface";
import {
  EXPENSE_REQUEST_STEPS,
  EXPENSE_REQUEST_STATUS_LABELS,
  TIPO_GASTO_LABELS,
} from "../interfaces/expense-purchase-request.interface";

// ── Configuración visual del timeline ────────────────────────────────────────

const ESTATUS_CFG: Record<ExpenseRequestStatus, { badgeCls: string; dotCls: string }> = {
  revision_requerimiento: { badgeCls: 'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',           dotCls: 'bg-slate-400' },
  contactando_proveedor:  { badgeCls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',                   dotCls: 'bg-sky-500' },
  cotizacion_solicitada:  { badgeCls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',               dotCls: 'bg-blue-500' },
  en_revision:            { badgeCls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',           dotCls: 'bg-amber-400' },
  pedido_emitido:         { badgeCls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',       dotCls: 'bg-indigo-500' },
  en_seguimiento:         { badgeCls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',       dotCls: 'bg-violet-500' },
  compra_recibida:        { badgeCls: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',               dotCls: 'bg-teal-500' },
  factura_firmada:        { badgeCls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',               dotCls: 'bg-cyan-500' },
  rg_registrado:          { badgeCls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',       dotCls: 'bg-orange-400' },
  documentos_integrados:  { badgeCls: 'bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400',               dotCls: 'bg-lime-500' },
  completado:             { badgeCls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',   dotCls: 'bg-emerald-500' },
  rechazado:              { badgeCls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',                   dotCls: 'bg-red-500' },
  cancelado:              { badgeCls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400',               dotCls: 'bg-zinc-400' },
};

const TIPO_GASTO_CLS: Record<TipoGasto, string> = {
  papeleria:               'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  material_oficina:        'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  limpieza:                'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
  mantenimiento:           'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  servicios_profesionales: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  transportacion:          'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  hospedaje_viaticos:      'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  suscripciones:           'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
  seguridad:               'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  cafeteria:               'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  otros:                   'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',
};

// Ícono representativo de cada paso del flujo (10 pasos)
const PASO_ICON: Record<number, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  1:  ComprasIcon,       // revisión del requerimiento
  2:  EmailIcon,         // contactando proveedor
  3:  ClipboardListIcon, // cotización solicitada
  4:  TasksIcon,         // en revisión
  5:  ComprasIcon,       // pedido emitido
  6:  HistoryIcon,       // en seguimiento
  7:  PackageCheckIcon,  // compra recibida
  8:  ReceiptIcon,       // factura firmada
  9:  ClipboardListIcon, // R.G. registrado
  10: CxpIcon,           // documentos integrados
};

// ── Estructura interna del timeline ──────────────────────────────────────────

interface TimelineStep {
  paso:       number;
  label:      string;
  estatus:    ExpenseRequestStatus;
  completado: boolean;
  esCurrent:  boolean;
  esEspecial: boolean;
  evento?:    ExpenseRequestEventRecord;
}

/** Construye la lista ordenada de pasos para el timeline */
function buildSteps(request: ExpensePurchaseRequest): TimelineStep[] {
  const { historial, paso_actual, estatus } = request;
  const esCancelado  = estatus === 'cancelado';
  const esRechazado  = estatus === 'rechazado';
  const esCompletado = estatus === 'completado';

  const pasos: TimelineStep[] = EXPENSE_REQUEST_STEPS.map((stepKey, idx) => {
    const numeroPaso = idx + 1;
    const evento     = historial.find((e) => e.paso === numeroPaso);
    const completado = numeroPaso < paso_actual || esCompletado;
    const esCurrent  = numeroPaso === paso_actual && !esCancelado && !esRechazado && !esCompletado;

    return {
      paso:       numeroPaso,
      label:      EXPENSE_REQUEST_STATUS_LABELS[stepKey],
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
      label:      EXPENSE_REQUEST_STATUS_LABELS['cancelado'],
      estatus:    'cancelado',
      completado: false,
      esCurrent:  true,
      esEspecial: true,
      evento:     eventoCancel,
    });
  } else if (esRechazado) {
    const eventoRec = historial.find((e) => e.estatus === 'rechazado');
    pasos.push({
      paso:       4,
      label:      EXPENSE_REQUEST_STATUS_LABELS['rechazado'],
      estatus:    'rechazado',
      completado: false,
      esCurrent:  true,
      esEspecial: true,
      evento:     eventoRec,
    });
  } else if (esCompletado) {
    const eventoFin = historial.find((e) => e.estatus === 'completado');
    pasos.push({
      paso:       EXPENSE_REQUEST_STEPS.length + 1,
      label:      'Enviado a Cobranza — Solicitud Cerrada',
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
  const cfg      = ESTATUS_CFG[step.estatus];
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
        ) : step.esCurrent && !step.esEspecial ? (
          <div className={`w-7 h-7 rounded-full ${cfg.dotCls} flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-zinc-900 ring-offset-1`}>
            <StepIcon className="w-3.5 h-3.5 text-white" />
          </div>
        ) : step.esEspecial ? (
          <div className={`w-7 h-7 rounded-full ${cfg.dotCls} flex items-center justify-center shadow-sm`}>
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
              {step.paso <= EXPENSE_REQUEST_STEPS.length ? `Paso ${step.paso} · ` : ''}{step.label}
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
              {EXPENSE_REQUEST_STATUS_LABELS[step.estatus]}
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

// ── Panel de resumen de la solicitud ─────────────────────────────────────────

function ResumenPanel({ request }: { request: ExpensePurchaseRequest }) {
  const cfg = ESTATUS_CFG[request.estatus];

  const filas: { label: string; value: React.ReactNode; hidden?: boolean }[] = [
    {
      label: 'Estatus',
      value: (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.badgeCls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
          {EXPENSE_REQUEST_STATUS_LABELS[request.estatus]}
        </span>
      ),
    },
    {
      label: 'Tipo de Gasto',
      value: (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${TIPO_GASTO_CLS[request.tipo_gasto]}`}>
          {TIPO_GASTO_LABELS[request.tipo_gasto]}
        </span>
      ),
    },
    { label: 'Área', value: request.area },
    { label: 'Solicitante', value: request.solicitante },
    { label: 'Proveedor', value: request.proveedor },
    {
      label: 'RFC',
      value: <span className="font-mono text-[11px]">{request.rfc_proveedor}</span>,
    },
    {
      label: 'Monto',
      value: (
        <span className="font-bold font-mono">
          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(request.monto)}
          <span className="ml-1 text-[10px] font-normal text-slate-400">MXN</span>
        </span>
      ),
    },
    {
      label: 'F. Solicitud',
      value: new Date(request.fecha_solicitud).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
    },
    {
      label: 'F. Est. Pago',
      value: request.fecha_estimada_pago
        ? new Date(request.fecha_estimada_pago).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : '—',
    },
    {
      label: 'F. Recepción',
      value: request.fecha_recepcion_real
        ? new Date(request.fecha_recepcion_real).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : '—',
    },
    {
      label: 'Aprobado por',
      value: request.aprobado_por ?? '—',
    },
    {
      label: 'Folio R.G.',
      value: request.folio_rg
        ? <span className="font-mono text-[11px]">{request.folio_rg}</span>
        : '—',
    },
  ];

  return (
    <div className="space-y-1.5">
      {/* Motivo de rechazo — destacado cuando aplica */}
      {request.motivo_rechazo && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2.5 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-0.5">Motivo de rechazo</p>
          <p className="text-xs text-red-700 dark:text-red-300">{request.motivo_rechazo}</p>
        </div>
      )}

      {filas.map(({ label, value, hidden }) =>
        hidden ? null : (
          <div key={label} className="flex gap-2 items-start py-1.5 border-b border-slate-100 dark:border-white/5 last:border-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-24 shrink-0 pt-0.5">
              {label}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-200 leading-snug wrap-break-word min-w-0">
              {value}
            </span>
          </div>
        ),
      )}

      {/* Justificación */}
      <div className="pt-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Justificación</p>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
          {request.justificacion}
        </p>
      </div>

      {/* Observaciones */}
      {request.observaciones && request.observaciones !== 'Sin observaciones.' && (
        <div className="pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Observaciones</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {request.observaciones}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Componente principal del dialog ──────────────────────────────────────────

interface ExpensePurchaseRequestDialogProps {
  request:      ExpensePurchaseRequest;
  open:         boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpensePurchaseRequestDialog({
  request,
  open,
  onOpenChange,
}: ExpensePurchaseRequestDialogProps) {
  const steps = buildSteps(request);
  const cfg   = ESTATUS_CFG[request.estatus];

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="860px"
      showCloseButton
      title={
        <DialogHeader
          title={`Solicitud de gasto ${request.folio}`}
          subtitle={`${request.solicitante} · ${request.area}`}
          statusColor="sky"
        />
      }
    >
      {/* ── Banner de estatus destacado ─────────────────────────────── */}
      <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 ${cfg.badgeCls}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotCls}`} aria-hidden="true" />
        <span className="text-xs font-bold">{EXPENSE_REQUEST_STATUS_LABELS[request.estatus]}</span>
        <span className="mx-2 text-current opacity-30">·</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${TIPO_GASTO_CLS[request.tipo_gasto]} opacity-90`}>
          {TIPO_GASTO_LABELS[request.tipo_gasto]}
        </span>
        <span className="mx-1 text-current opacity-30">·</span>
        <span className="text-xs opacity-75 truncate">{request.proveedor}</span>
      </div>

      {/* ── Layout de dos columnas: resumen + timeline ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

        {/* Columna izquierda — resumen de la solicitud */}
        <div className="md:col-span-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <ClipboardListIcon className="w-3.5 h-3.5" />
            Detalle de la solicitud
          </h3>
          <ResumenPanel request={request} />
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
