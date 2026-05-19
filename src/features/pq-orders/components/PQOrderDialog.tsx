"use client";

import {
  CheckIcon,
  HistoryIcon,
  OrdenesIcon,
  ClipboardListIcon,
  TasksIcon,
  EmailIcon,
  ComprasIcon,
  PackageCheckIcon,
  ErrorIcon,
} from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type {
  PQOrder,
  PQOrderStatus,
  PQOrderEventRecord,
  CategoriaInsumo,
} from "../interfaces/pq-order.interface";
import {
  PQ_ORDER_STEPS,
  PQ_ORDER_STATUS_LABELS,
  CATEGORIA_INSUMO_LABELS,
} from "../interfaces/pq-order.interface";

// ── Configuración visual del timeline ────────────────────────────────────────

const ESTATUS_CFG: Record<PQOrderStatus, { badgeCls: string; dotCls: string }> = {
  pedido_generado:       { badgeCls: 'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',       dotCls: 'bg-slate-400' },
  cantidades_ingresadas: { badgeCls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',               dotCls: 'bg-sky-500' },
  verificando_surtido:   { badgeCls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',           dotCls: 'bg-blue-500' },
  en_seguimiento:        { badgeCls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',       dotCls: 'bg-amber-400' },
  confirmando_proveedor: { badgeCls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',   dotCls: 'bg-orange-400' },
  proveedor_procesando:  { badgeCls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',   dotCls: 'bg-indigo-500' },
  contactando_almacen:   { badgeCls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',   dotCls: 'bg-violet-500' },
  surtido:               { badgeCls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', dotCls: 'bg-emerald-500' },
  cancelado:             { badgeCls: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400',           dotCls: 'bg-zinc-400' },
};

const CATEGORIA_CLS: Record<CategoriaInsumo, string> = {
  telas_insumos:        'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  hilos_accesorios:     'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  empaque:              'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
  bordados_serigrafia:  'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  etiquetado:           'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
  otros_materiales:     'bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300',
};

// Ícono representativo de cada paso del flujo (7 pasos)
const PASO_ICON: Record<number, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  1: OrdenesIcon,        // Pedido PQ generado
  2: ClipboardListIcon,  // Cantidades ingresadas
  3: TasksIcon,          // Verificando surtido
  4: HistoryIcon,        // En seguimiento logístico
  5: EmailIcon,          // Confirmando con proveedor
  6: ComprasIcon,        // Proveedor procesando insumos
  7: PackageCheckIcon,   // Contactando almacén y compras
};

// ── Estructura interna del timeline ──────────────────────────────────────────

interface TimelineStep {
  paso:       number;
  label:      string;
  estatus:    PQOrderStatus;
  completado: boolean;
  esCurrent:  boolean;
  esEspecial: boolean;
  evento?:    PQOrderEventRecord;
}

/** Construye la lista ordenada de pasos para el timeline de un Pedido PQ */
function buildSteps(pedido: PQOrder): TimelineStep[] {
  const { historial, paso_actual, estatus } = pedido;
  const esCancelado = estatus === 'cancelado';
  const esSurtido   = estatus === 'surtido';

  const pasos: TimelineStep[] = PQ_ORDER_STEPS.map((stepKey, idx) => {
    const numeroPaso = idx + 1;
    const evento     = historial.find((e) => e.paso === numeroPaso);
    const completado = numeroPaso < paso_actual || esSurtido;
    const esCurrent  = numeroPaso === paso_actual && !esCancelado && !esSurtido;

    return {
      paso:       numeroPaso,
      label:      PQ_ORDER_STATUS_LABELS[stepKey],
      estatus:    evento?.estatus ?? stepKey,
      completado,
      esCurrent,
      esEspecial: false,
      evento,
    };
  });

  // Evento especial al final según estatus terminal
  if (esCancelado) {
    const eventoCancel = historial.find((e) => e.estatus === 'cancelado');
    pasos.push({
      paso:       paso_actual,
      label:      PQ_ORDER_STATUS_LABELS['cancelado'],
      estatus:    'cancelado',
      completado: false,
      esCurrent:  true,
      esEspecial: true,
      evento:     eventoCancel,
    });
  } else if (esSurtido) {
    const eventoFin = historial.find((e) => e.estatus === 'surtido');
    pasos.push({
      paso:       PQ_ORDER_STEPS.length + 1,
      label:      'Pedido Surtido — Materiales en Almacén',
      estatus:    'surtido',
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
              {step.paso <= PQ_ORDER_STEPS.length ? `Paso ${step.paso} · ` : ''}{step.label}
            </p>
            {step.evento && (
              <p className="text-[11px] text-slate-400 mt-0.5">{step.evento.responsable}</p>
            )}
          </div>
          {step.evento && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${cfg.badgeCls}`}
            >
              <span className={`w-1 h-1 rounded-full shrink-0 ${cfg.dotCls}`} aria-hidden="true" />
              {PQ_ORDER_STATUS_LABELS[step.estatus]}
            </span>
          )}
        </div>

        {/* Notas del evento */}
        {step.evento?.notas && (
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {step.evento.notas}
          </p>
        )}

        {/* Fecha del evento */}
        {step.evento?.fecha && (
          <p className="mt-1 text-[10px] text-slate-400 font-mono">
            {new Date(step.evento.fecha).toLocaleString('es-MX', {
              day:    '2-digit',
              month:  'short',
              year:   'numeric',
              hour:   '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Panel de resumen ──────────────────────────────────────────────────────────

function ResumenPanel({ pedido }: { pedido: PQOrder }) {
  const porcentajeSurtido = pedido.cantidad_solicitada > 0
    ? Math.min(100, Math.round((pedido.cantidad_surtida / pedido.cantidad_solicitada) * 100))
    : 0;

  return (
    <div className="space-y-4">
      {/* Cabecera de estatus */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Estatus actual</p>
          <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTATUS_CFG[pedido.estatus].badgeCls}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ESTATUS_CFG[pedido.estatus].dotCls}`} aria-hidden="true" />
            {PQ_ORDER_STATUS_LABELS[pedido.estatus]}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">O.C. Vinculada</p>
          <p className="text-xs font-bold font-mono text-slate-700 dark:text-slate-200 mt-0.5">{pedido.oc_referencia}</p>
        </div>
      </div>

      {/* Progreso de surtido */}
      <div className="rounded-lg border border-slate-200 dark:border-white/10 p-3 bg-slate-50 dark:bg-white/5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Progreso de surtido</p>
          <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">
            {porcentajeSurtido}%
          </span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${porcentajeSurtido >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
            style={{ width: `${porcentajeSurtido}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {pedido.cantidad_surtida} / {pedido.cantidad_solicitada} {pedido.unidad}
        </p>
      </div>

      {/* Campos del pedido */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Proveedor</p>
          <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">{pedido.proveedor}</p>
          <p className="text-[10px] font-mono text-slate-400">{pedido.rfc_proveedor}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Categoría</p>
          <span className={`inline-flex items-center px-2 py-0.5 mt-0.5 rounded-md text-xs font-semibold ${CATEGORIA_CLS[pedido.categoria]}`}>
            {CATEGORIA_INSUMO_LABELS[pedido.categoria]}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Monto Estimado</p>
          <p className="text-xs font-bold font-mono text-slate-700 dark:text-slate-200 mt-0.5">
            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(pedido.monto_estimado)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Intentos de surtido</p>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{pedido.intentos_surtido}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Responsable Compras</p>
          <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">{pedido.responsable_compras}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fecha de Solicitud</p>
          <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">
            {new Date(pedido.fecha_solicitud).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        {pedido.fecha_estimada_entrega && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Entrega Estimada</p>
            <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">
              {new Date(pedido.fecha_estimada_entrega).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        )}
        {pedido.fecha_surtido_real && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Surtido Real</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              {new Date(pedido.fecha_surtido_real).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        )}
      </div>

      {/* Observaciones */}
      {pedido.observaciones && pedido.observaciones !== 'Sin observaciones.' && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
            Observaciones
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            {pedido.observaciones}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Componente principal del diálogo ─────────────────────────────────────────

interface PQOrderDialogProps {
  pedido:         PQOrder;
  open:           boolean;
  onOpenChange:   (open: boolean) => void;
}

/** Diálogo de detalle y trazabilidad de un Pedido PQ */
export function PQOrderDialog({ pedido, open, onOpenChange }: PQOrderDialogProps) {
  const steps = buildSteps(pedido);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton
      title={
        <DialogHeader
          title={pedido.folio}
          subtitle={pedido.descripcion}
          statusColor="sky"
        />
      }
    >
      {/* ── Layout de dos columnas: resumen + timeline ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

        {/* Columna izquierda — resumen del pedido */}
        <div className="md:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Resumen del pedido
          </p>
          <ResumenPanel pedido={pedido} />
        </div>

        {/* Columna derecha — timeline de historial */}
        <div className="md:col-span-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Historial del flujo
          </p>
          <div>
            {steps.map((step, idx) => (
              <TimelineItem
                key={`${step.paso}-${step.estatus}`}
                step={step}
                isLast={idx === steps.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </MainDialog>
  );
}
