"use client";
// Diálogo de validación del arte de bordado — Aprobar o mandar a corregir
import { useState } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  RejectIcon,
} from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type {
  EmbroideryOrder,
  TecnicaImpresion,
  EstatusValidacionArte,
  ValidacionArte,
} from "../interfaces/embroidery-order.interface";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmbroideryArtValidationDialogProps {
  order: EmbroideryOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Configuración de técnicas de impresión ────────────────────────────────

interface TecnicaInfo {
  label: string;
  /** Descripción corta para el card */
  descripcion: string;
  /** Características clave separadas por pipe (max 4) */
  caracteristicas: string[];
  /** Clases de color para el borde y acento del card */
  borderCls: string;
  /** Clases de color para el fondo del encabezado */
  headerCls: string;
  /** Clases del texto del encabezado */
  titleCls: string;
}

const TECNICA_INFO: Record<TecnicaImpresion, TecnicaInfo> = {
  dtf: {
    label: 'DTF',
    descripcion: 'Transferencia Directa a Tela',
    caracteristicas: ['Diseño editable', 'Amplia gama de colores', 'Alta durabilidad'],
    borderCls: 'border-amber-400 dark:border-amber-500',
    headerCls: 'bg-amber-50 dark:bg-amber-500/10',
    titleCls: 'text-amber-700 dark:text-amber-400',
  },
  serigrafia: {
    label: 'Serigrafía',
    descripcion: 'Impresión por malla y tintas especiales',
    caracteristicas: ['Proceso de revelado', 'Diseño en curvas o no editable', 'Alta durabilidad', 'Colores definidos'],
    borderCls: 'border-rose-400 dark:border-rose-500',
    headerCls: 'bg-rose-50 dark:bg-rose-500/10',
    titleCls: 'text-rose-700 dark:text-rose-400',
  },
  vinil: {
    label: 'Vinil',
    descripcion: 'Corte y aplicación de vinil textil',
    caracteristicas: ['Material reflejante', 'Ideal para alta visibilidad'],
    borderCls: 'border-violet-400 dark:border-violet-500',
    headerCls: 'bg-violet-50 dark:bg-violet-500/10',
    titleCls: 'text-violet-700 dark:text-violet-400',
  },
  sublimado: {
    label: 'Sublimado',
    descripcion: 'Impresión por sublimación térmica',
    caracteristicas: ['Requiere 100% poliéster en color blanco', 'Ideal para parches'],
    borderCls: 'border-cyan-400 dark:border-cyan-500',
    headerCls: 'bg-cyan-50 dark:bg-cyan-500/10',
    titleCls: 'text-cyan-700 dark:text-cyan-400',
  },
};

// ─── Configuración de estatus de validación ───────────────────────────────

const ESTATUS_ARTE_CFG: Record<
  EstatusValidacionArte,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pendiente: {
    label: 'Pendiente de validación',
    cls: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-500/10',
    icon: ClockIcon,
  },
  aprobado: {
    label: 'Arte aprobado',
    cls: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
    icon: CheckCircleIcon,
  },
  en_correccion: {
    label: 'En corrección',
    cls: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10',
    icon: RejectIcon,
  },
};

// ─── Sub-componente: Card de técnica de impresión ────────────────────────────

function TecnicaCard({ tecnica, activa }: { tecnica: TecnicaImpresion; activa: boolean }) {
  const info = TECNICA_INFO[tecnica];
  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all duration-200 ${
        activa
          ? `${info.borderCls} shadow-md`
          : 'border-slate-200 dark:border-white/10 opacity-40'
      }`}
    >
      <div className={`rounded-lg px-3 py-2 mb-3 ${info.headerCls}`}>
        <p className={`text-sm font-bold ${info.titleCls}`}>{info.label}</p>
        <p className={`text-[11px] mt-0.5 ${info.titleCls} opacity-80`}>{info.descripcion}</p>
      </div>
      <ul className="space-y-1.5">
        {info.caracteristicas.map((c) => (
          <li key={c} className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-300">
            <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${activa ? info.borderCls.replace('border-', 'bg-') : 'bg-slate-300'}`} />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Sub-componente: Indicador de estatus del arte ───────────────────────────

function EstatusArteIndicator({ validacion }: { validacion: ValidacionArte }) {
  const cfg = ESTATUS_ARTE_CFG[validacion.estatus];
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 ${cfg.cls}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{cfg.label}</p>
        {validacion.validado_por && (
          <p className="text-[11px] opacity-70 mt-0.5">
            Por {validacion.validado_por}
            {validacion.fecha_validacion && ` · ${new Date(validacion.fecha_validacion + 'T00:00:00').toLocaleDateString('es-MX')}`}
          </p>
        )}
        {validacion.observaciones && (
          <p className="text-[11px] mt-1.5 opacity-80 leading-relaxed">
            &ldquo;{validacion.observaciones}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function EmbroideryArtValidationDialog({
  order,
  open,
  onOpenChange,
}: EmbroideryArtValidationDialogProps) {
  // Estado local de simulación — en producción esto dispararía una mutación al servidor
  const [validacion, setValidacion] = useState<ValidacionArte>(order.validacion_arte);
  // Vista activa: 'resumen' | 'correccion'
  const [vista, setVista] = useState<'resumen' | 'correccion'>('resumen');
  const [motivoCorreccion, setMotivoCorreccion] = useState(
    order.validacion_arte.estatus === 'en_correccion'
      ? order.validacion_arte.observaciones
      : ''
  );

  // El arte no puede validarse si la orden ya inició producción
  const puedeActuar =
    order.estatus_hoja === 'sin_liberar' || order.estatus_hoja === 'liberada';

  // Simula la aprobación del arte (sin llamada real al servidor)
  function handleAprobar() {
    setValidacion({
      estatus: 'aprobado',
      validado_por: 'Usuario actual',
      fecha_validacion: new Date().toISOString().split('T')[0],
      observaciones: '',
    });
    setVista('resumen');
  }

  // Simula el envío a corrección con las observaciones capturadas
  function handleCorregir() {
    if (!motivoCorreccion.trim()) return;
    setValidacion({
      estatus: 'en_correccion',
      validado_por: 'Usuario actual',
      fecha_validacion: new Date().toISOString().split('T')[0],
      observaciones: motivoCorreccion.trim(),
    });
    setVista('resumen');
  }

  function handleClose() {
    setVista('resumen');
    onOpenChange(false);
  }

  return (
    <MainDialog
      title={
        <DialogHeader
          title="Validación de Arte"
          subtitle={`${order.numero_orden} · ${order.cliente}`}
          statusColor="emerald"
        />
      }
      open={open}
      onOpenChange={handleClose}
      maxWidth="680px"
      showCloseButton={false}
    >
      <div className="px-6 pb-6 space-y-5">

        {/* ── Técnica asignada ─────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
            Técnica de impresión asignada
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['dtf', 'serigrafia', 'vinil', 'sublimado'] as TecnicaImpresion[]).map((t) => (
              <TecnicaCard
                key={t}
                tecnica={t}
                activa={t === order.tecnica_impresion}
              />
            ))}
          </div>
        </div>

        {/* ── Estatus actual del arte ───────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
            Estatus del arte
          </p>
          <EstatusArteIndicator validacion={validacion} />
        </div>

        {/* ── Flujo de validación ───────────────────────────────────────── */}
        {puedeActuar && vista === 'resumen' && (
          <div className="pt-1">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
              Acciones
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleAprobar}
                disabled={validacion.estatus === 'aprobado'}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  validacion.estatus === 'aprobado'
                    ? 'bg-emerald-100 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-500 cursor-not-allowed opacity-60'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-[0.98]'
                }`}
              >
                <CheckCircleIcon className="w-4 h-4" />
                {validacion.estatus === 'aprobado' ? 'Arte aprobado' : 'Aprobar arte'}
              </button>
              <button
                type="button"
                onClick={() => setVista('correccion')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                  bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20
                  dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 transition-all active:scale-[0.98]"
              >
                <ExclamationTriangleIcon className="w-4 h-4" />
                Mandar a corregir
              </button>
            </div>
          </div>
        )}

        {/* ── Formulario de corrección ──────────────────────────────────── */}
        {puedeActuar && vista === 'correccion' && (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="motivo-correccion"
                className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2"
              >
                Instrucciones de corrección
              </label>
              <textarea
                id="motivo-correccion"
                rows={4}
                value={motivoCorreccion}
                onChange={(e) => setMotivoCorreccion(e.target.value)}
                placeholder="Describe los cambios necesarios para aprobar el arte…"
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5
                  text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500
                  px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-rose-400/50
                  dark:focus:ring-rose-500/40 transition"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setVista('resumen')}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400
                  hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCorregir}
                disabled={!motivoCorreccion.trim()}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700
                  text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar a corrección
              </button>
            </div>
          </div>
        )}

        {/* ── Mensaje informativo si la orden ya está en producción ──────── */}
        {!puedeActuar && (
          <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 dark:bg-white/5
            border border-slate-200 dark:border-white/10 px-4 py-3">
            <ExclamationTriangleIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              La validación del arte no está disponible porque la orden ya inició el proceso
              de bordado ({order.estatus_hoja === 'en_proceso' ? 'En Proceso' : 'Terminada'}).
            </p>
          </div>
        )}
      </div>
    </MainDialog>
  );
}
