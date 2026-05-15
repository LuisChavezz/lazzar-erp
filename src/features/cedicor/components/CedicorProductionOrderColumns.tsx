"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { CedicorProductionOrderTimelineDialog } from "./CedicorProductionOrderTimelineDialog";
import type {
  ProductionOrder,
  ProductionOrderStatus,
  MaterialVerificationStatus,
} from "../interfaces/cedicor-production-order.interface";
import {
  PRODUCTION_ORDER_STEPS,
  PRODUCTION_ORDER_STATUS_LABELS,
} from "../interfaces/cedicor-production-order.interface";
import { ActionMenu } from "@/src/components/ActionMenu";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import {
  ViewIcon,
  DeleteIcon,
  HistoryIcon,
  EmailIcon,
  PaperPlaneIcon,
  ClipboardListIcon,
  FacturacionIcon,
  FileCode2Icon,
  DownloadIcon,
} from "@/src/components/Icons";

// ── Configuración visual de estatus ──────────────────────────────────────────

const ESTATUS_CFG: Record<ProductionOrderStatus, { cls: string; dot: string }> = {
  orden_generada:          { cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',             dot: 'bg-blue-500' },
  op_enviada_correo:       { cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',     dot: 'bg-indigo-500' },
  ficha_tecnica_generada:  { cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',     dot: 'bg-violet-500' },
  verificacion_materiales: { cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',         dot: 'bg-amber-500' },
  entregado_a_trazo:       { cls: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',             dot: 'bg-teal-500' },
  trazo_a_corte:           { cls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',             dot: 'bg-cyan-500' },
  corte_completado:        { cls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',     dot: 'bg-orange-500' },
  consumo_capturado:       { cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',                 dot: 'bg-sky-500' },
  despachado_confeccion:   { cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', dot: 'bg-emerald-500' },
  material_faltante:       { cls: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',    dot: 'bg-orange-500' },
  cancelado:               { cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',                 dot: 'bg-red-500' },
};

const VERIFICACION_CFG: Record<
  MaterialVerificationStatus,
  { label: string; cls: string; dot: string }
> = {
  sin_verificar: { label: 'Sin Verificar', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400',       dot: 'bg-slate-400' },
  disponible:    { label: 'Disponible',    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', dot: 'bg-emerald-500' },
  faltante:      { label: 'Faltante',      cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',                dot: 'bg-red-500' },
  parcial:       { label: 'Parcial',       cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',        dot: 'bg-amber-500' },
};

// ── Sub-componentes de celda ──────────────────────────────────────────────────

/** Badge de estatus con indicador de color */
const EstatusBadge = ({ estatus }: { estatus: ProductionOrderStatus }) => {
  const cfg = ESTATUS_CFG[estatus];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {PRODUCTION_ORDER_STATUS_LABELS[estatus]}
    </span>
  );
};

/** Badge de verificación de materiales */
const VerificacionBadge = ({ estado }: { estado: MaterialVerificationStatus }) => {
  const cfg = VERIFICACION_CFG[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
};

/**
 * Indicador compacto de progreso por pasos dentro de la celda de tabla.
 * Muestra el número de paso actual y una pista de 9 puntos coloreados.
 * Estados especiales: cancelado (rojo), material_faltante (ámbar), completado (verde).
 */
const MiniStepper = ({
  pasoActual,
  estatus,
}: {
  pasoActual: number;
  estatus: ProductionOrderStatus;
}) => {
  const total      = PRODUCTION_ORDER_STEPS.length; // 9
  const filled     = Math.min(pasoActual, total);
  const cancelado  = estatus === 'cancelado';
  const bloqueado  = estatus === 'material_faltante';
  const completado = estatus === 'despachado_confeccion';

  const labelCls = cancelado
    ? 'text-red-500 dark:text-red-400'
    : bloqueado
    ? 'text-amber-600 dark:text-amber-400'
    : completado
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-slate-700 dark:text-slate-200';

  const label = cancelado
    ? 'Cancelado'
    : bloqueado
    ? 'Bloqueado'
    : completado
    ? 'Completo'
    : `Paso ${filled} / ${total}`;

  return (
    <div className="flex flex-col gap-1 min-w-25">
      <span className={`text-xs font-semibold tabular-nums ${labelCls}`}>{label}</span>
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {PRODUCTION_ORDER_STEPS.map((_, i) => {
          const isDone    = i < filled;
          const isCurrent = i === filled - 1;

          let dotCls: string;
          if (cancelado) {
            dotCls = isDone ? 'w-3 bg-red-400 dark:bg-red-500' : 'w-3 bg-slate-200 dark:bg-white/10';
          } else if (bloqueado) {
            if (isCurrent) dotCls = 'w-4 bg-amber-500 dark:bg-amber-400';
            else if (isDone) dotCls = 'w-3 bg-amber-300 dark:bg-amber-700';
            else dotCls = 'w-3 bg-slate-200 dark:bg-white/10';
          } else if (completado) {
            dotCls = isDone ? 'w-3 bg-emerald-400 dark:bg-emerald-500' : 'w-3 bg-slate-200 dark:bg-white/10';
          } else if (isCurrent) {
            dotCls = 'w-4 bg-sky-500 dark:bg-sky-400';
          } else if (isDone) {
            dotCls = 'w-3 bg-sky-300 dark:bg-sky-600';
          } else {
            dotCls = 'w-3 bg-slate-200 dark:bg-white/10';
          }

          return <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${dotCls}`} />;
        })}
      </div>
    </div>
  );
};

// ── Celda de acciones con menú contextual y diálogos ─────────────────────────

/** Celda de la columna de acciones. Gestiona el estado local del diálogo de timeline. */
const ActionsCell = ({ row }: { row: ProductionOrder }) => {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const { estatus, id } = row;
  const enProgreso = estatus !== 'cancelado' && estatus !== 'despachado_confeccion';

  const menuItems: ActionMenuItem[] = [
    // ── Acciones universales ─────────────────────────────────────────────────
    {
      label: 'Ver detalle',
      icon: ViewIcon,
      onSelect: () => console.log('ver-detalle', id),
    },
    {
      label: 'Ver historial',
      icon: HistoryIcon,
      onSelect: () => setIsTimelineOpen(true),
    },
    {
      label: 'Descargar orden',
      icon: DownloadIcon,
      onSelect: () => console.log('descargar', id),
    },

    // ── orden_generada: enviar OP por correo ─────────────────────────────────
    {
      label: 'Enviar OP por correo',
      icon: EmailIcon,
      onSelect: () => console.log('enviar-op-correo', id),
      visible: estatus === 'orden_generada',
    },

    // ── op_enviada_correo: reenviar OP o ver documento ───────────────────────
    {
      label: 'Reenviar OP',
      icon: PaperPlaneIcon,
      onSelect: () => console.log('reenviar-op', id),
      visible: estatus === 'op_enviada_correo',
    },
    {
      label: 'Ver orden de producción',
      icon: FacturacionIcon,
      onSelect: () => console.log('ver-op', id),
      visible: ['op_enviada_correo', 'ficha_tecnica_generada', 'verificacion_materiales'].includes(estatus),
    },

    // ── op_enviada_correo: generar ficha técnica ─────────────────────────────
    {
      label: 'Generar ficha técnica',
      icon: FileCode2Icon,
      onSelect: () => console.log('generar-ficha-tecnica', id),
      visible: estatus === 'op_enviada_correo',
    },

    // ── ficha_tecnica_generada: ver ficha técnica ya generada ────────────────
    {
      label: 'Ver ficha técnica',
      icon: FileCode2Icon,
      onSelect: () => console.log('ver-ficha-tecnica', id),
      visible: estatus !== 'orden_generada' && estatus !== 'op_enviada_correo' && row.tiene_ficha_tecnica,
    },

    // ── verificacion_materiales / material_faltante: registrar disponibilidad
    {
      label: 'Registrar disponibilidad',
      icon: ClipboardListIcon,
      onSelect: () => console.log('registrar-disponibilidad', id),
      visible: estatus === 'verificacion_materiales' || estatus === 'material_faltante',
    },

    // ── Cancelar — disponible mientras la orden está activa ──────────────────
    {
      label: 'Cancelar orden',
      icon: DeleteIcon,
      onSelect: () => console.log('cancelar', id),
      visible: enProgreso,
    },
  ];

  return (
    <>
      <div className="flex justify-center">
        <ActionMenu items={menuItems} />
      </div>
      <CedicorProductionOrderTimelineDialog
        order={row}
        open={isTimelineOpen}
        onOpenChange={setIsTimelineOpen}
      />
    </>
  );
};

// ── Definición de columnas ────────────────────────────────────────────────────

const col = createColumnHelper<ProductionOrder>();

export function getCedicorProductionOrderColumns(): ColumnDef<ProductionOrder>[] {
  return [
    col.accessor('folio', {
      header: 'Folio',
      meta: { label: 'Folio' },
      cell: (info) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
          {info.getValue<string>()}
        </span>
      ),
      size: 130,
    }),

    col.accessor('fecha_creacion', {
      header: 'Fecha',
      meta: { label: 'Fecha' },
      cell: (info) => {
        const fecha = new Date(info.getValue<string>());
        return (
          <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
            {fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      },
      size: 120,
    }),

    col.accessor('cliente', {
      header: 'Cliente',
      meta: { label: 'Cliente' },
      cell: (info) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 max-w-40">
          {info.getValue<string>()}
        </span>
      ),
      size: 180,
    }),

    col.accessor('nombre_producto', {
      header: 'Producto',
      meta: { label: 'Producto' },
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex flex-col gap-0.5 min-w-35">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-1">
              {info.getValue<string>()}
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              {row.clave_producto}
            </span>
          </div>
        );
      },
      size: 180,
    }),

    col.accessor('cantidad_total', {
      header: 'Piezas',
      meta: { label: 'Piezas' },
      cell: (info) => (
        <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">
          {info.getValue<number>().toLocaleString('es-MX')}
        </span>
      ),
      size: 80,
    }),

    col.accessor('paso_actual', {
      header: 'Progreso',
      meta: { label: 'Progreso' },
      cell: (info) => {
        const row = info.row.original;
        return (
          <MiniStepper
            pasoActual={info.getValue<number>()}
            estatus={row.estatus}
          />
        );
      },
      size: 160,
    }),

    col.accessor('estatus', {
      header: 'Estatus',
      meta: { label: 'Estatus' },
      cell: (info) => <EstatusBadge estatus={info.getValue<ProductionOrderStatus>()} />,
      size: 195,
    }),

    col.accessor('verificacion_materiales', {
      header: 'Materiales',
      meta: { label: 'Materiales' },
      cell: (info) => (
        <VerificacionBadge estado={info.getValue<MaterialVerificationStatus>()} />
      ),
      size: 130,
    }),

    col.accessor('responsable_actual', {
      header: 'Responsable',
      meta: { label: 'Responsable' },
      cell: (info) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
          {info.getValue<string>()}
        </span>
      ),
      size: 150,
    }),

    col.accessor('fecha_estimada_entrega', {
      header: 'Est. Entrega',
      meta: { label: 'Est. Entrega' },
      cell: (info) => {
        const val = info.getValue<string | null>();
        if (!val) return <span className="text-slate-400 dark:text-slate-600 text-xs">—</span>;
        const fecha   = new Date(val);
        const hoy     = new Date();
        const vencida = fecha < hoy && info.row.original.estatus !== 'despachado_confeccion';
        return (
          <span
            className={`text-xs whitespace-nowrap ${
              vencida
                ? 'text-red-500 dark:text-red-400 font-semibold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      },
      size: 120,
    }),

    col.display({
      id: 'acciones',
      header: '',
      meta: { label: 'Acciones' },
      cell: (info) => <ActionsCell row={info.row.original} />,
      size: 80,
    }),
  ] as ColumnDef<ProductionOrder>[];
}
