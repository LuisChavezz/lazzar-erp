"use client";
// Diálogo de gestión de ponchados por orden de bordado
import { InfoIcon } from "@/src/components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import type {
  EmbroideryOrder,
  Ponchado,
  TipoPonchado,
  EstatusPonchado,
} from "../interfaces/embroidery-order.interface";

// Configuración visual para cada tipo de actividad de ponchado
// (según la descripción de las categorías del área)
const TIPO_CFG: Record<
  TipoPonchado,
  {
    label: string;
    descripcion: string;
    dotCls: string;
    bgCls: string;
    borderCls: string;
    cardBg: string;
    cardBorder: string;
  }
> = {
  bordado: {
    label: 'Bordado',
    descripcion: 'Registro de pedidos de bordado convencional procesados durante el día.',
    dotCls: 'bg-amber-400',
    bgCls: 'bg-amber-50/60 dark:bg-amber-500/8',
    borderCls: 'border-amber-300/70 dark:border-amber-500/25',
    cardBg: 'bg-amber-50 dark:bg-amber-500/10',
    cardBorder: 'border-amber-200/80 dark:border-amber-500/25',
  },
  arreglo: {
    label: 'Arreglos',
    descripcion: 'Correcciones y ajustes a diseños existentes que requieren modificación antes de bordar.',
    dotCls: 'bg-rose-500',
    bgCls: 'bg-rose-50/60 dark:bg-rose-500/8',
    borderCls: 'border-rose-300/70 dark:border-rose-500/25',
    cardBg: 'bg-rose-50 dark:bg-rose-500/10',
    cardBorder: 'border-rose-200/80 dark:border-rose-500/25',
  },
  ponchado: {
    label: 'Ponchados',
    descripcion: 'Digitalización de nuevos diseños para convertirlos en archivos de bordado ejecutables.',
    dotCls: 'bg-orange-400',
    bgCls: 'bg-orange-50/60 dark:bg-orange-500/8',
    borderCls: 'border-orange-300/70 dark:border-orange-500/25',
    cardBg: 'bg-orange-50 dark:bg-orange-500/10',
    cardBorder: 'border-orange-200/80 dark:border-orange-500/25',
  },
  serigrafia: {
    label: 'Serigrafía',
    descripcion: 'Pedidos relacionados con impresión serigráfica gestionados desde el área de bordado.',
    dotCls: 'bg-sky-500',
    bgCls: 'bg-sky-50/60 dark:bg-sky-500/8',
    borderCls: 'border-sky-300/70 dark:border-sky-500/25',
    cardBg: 'bg-sky-50 dark:bg-sky-500/10',
    cardBorder: 'border-sky-200/80 dark:border-sky-500/25',
  },
  envio_muestra: {
    label: 'Envío de Muestras',
    descripcion: 'Fechas de envío de muestras para autorización por parte del cliente antes de producción.',
    dotCls: 'bg-teal-500',
    bgCls: 'bg-teal-50/60 dark:bg-teal-500/8',
    borderCls: 'border-teal-300/70 dark:border-teal-500/25',
    cardBg: 'bg-teal-50 dark:bg-teal-500/10',
    cardBorder: 'border-teal-200/80 dark:border-teal-500/25',
  },
};

// Configuración visual del estatus de cada registro de ponchado
const ESTATUS_CFG: Record<EstatusPonchado, { label: string; cls: string; dot: string }> = {
  pendiente: {
    label: 'Pendiente',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    dot: 'bg-amber-400',
  },
  en_proceso: {
    label: 'En Proceso',
    cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
    dot: 'bg-indigo-500',
  },
  listo: {
    label: 'Listo',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  observacion: {
    label: 'En Observación',
    cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
};

// ─── Tarjeta individual de ponchado ──────────────────────────────────────────

interface PonchadoCardProps {
  ponchado: Ponchado;
  cardBg: string;
  cardBorder: string;
}

function PonchadoCard({ ponchado, cardBg, cardBorder }: PonchadoCardProps) {
  const estatusCfg = ESTATUS_CFG[ponchado.estatus];
  return (
    <div className={`rounded-xl border p-3.5 space-y-2 ${cardBg} ${cardBorder}`}>

      {/* Encabezado: clave + estatus */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="space-y-0.5 min-w-0">
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
            {ponchado.clave_diseno}
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-snug">
            {ponchado.nombre_diseno}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${estatusCfg.cls}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${estatusCfg.dot}`} />
          {estatusCfg.label}
        </span>
      </div>

      {/* Métricas: puntos, digitalizador, fechas */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {ponchado.puntos.toLocaleString('es-MX')}
          </span>{' '}
          puntos
        </span>
        {ponchado.digitalizador && (
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            {ponchado.digitalizador}
          </span>
        )}
        {ponchado.fecha_solicitud && (
          <span>
            Sol.{' '}
            {new Date(ponchado.fecha_solicitud + 'T00:00:00').toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'short',
            })}
          </span>
        )}
        {ponchado.fecha_entrega && (
          <span className="text-emerald-600 dark:text-emerald-400">
            Ent.{' '}
            {new Date(ponchado.fecha_entrega + 'T00:00:00').toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'short',
            })}
          </span>
        )}
      </div>

      {/* Observaciones */}
      {ponchado.observaciones && (
        <p className="text-[11px] italic text-slate-500 dark:text-slate-400 border-t border-current/10 pt-2">
          {ponchado.observaciones}
        </p>
      )}
    </div>
  );
}

// ─── Diálogo principal ───────────────────────────────────────────────────────

interface EmbroideryPonchadoDialogProps {
  order: EmbroideryOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmbroideryPonchadoDialog({
  order,
  open,
  onOpenChange,
}: EmbroideryPonchadoDialogProps) {
  const ponchados = order.ponchados ?? [];
  // Tipos únicos presentes en esta orden, en el orden canónico de la pantalla
  const ordenTipos: TipoPonchado[] = ['bordado', 'arreglo', 'ponchado', 'serigrafia', 'envio_muestra'];
  const tiposPresentes = ordenTipos.filter(t => ponchados.some(p => p.tipo === t));

  return (
    <MainDialog
      title={
        <DialogHeader
          title="Gestión de Ponchados"
          subtitle={`${order.numero_orden} · ${order.pedido}`}
          statusColor="violet"
        />
      }
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="700px"
      showCloseButton={false}
    >
      <div className="space-y-5">

        {/* Datos de contexto de la orden */}
        <div className="flex flex-wrap gap-4 px-0.5 text-xs text-slate-500 dark:text-slate-400">
          <span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Cliente: </span>
            {order.cliente}
          </span>
          <span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Estatus: </span>
            {order.estatus_hoja.replace('_', ' ')}
          </span>
          {order.fecha_entrega_pedido && (
            <span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Entrega: </span>
              {new Date(order.fecha_entrega_pedido + 'T00:00:00').toLocaleDateString('es-MX')}
            </span>
          )}
        </div>

        {/* Estado vacío */}
        {ponchados.length === 0 ? (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <InfoIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Esta orden no tiene actividades de ponchado registradas.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {tiposPresentes.map(tipo => {
              const cfg = TIPO_CFG[tipo];
              const items = ponchados.filter(p => p.tipo === tipo);
              return (
                <div key={tipo} className="space-y-2.5">

                  {/* Encabezado del grupo con descripción */}
                  <div
                    className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bgCls} ${cfg.borderCls}`}
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${cfg.dotCls}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                        {cfg.label}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {cfg.descripcion}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-white/10 px-2 py-0.5 rounded-full shrink-0">
                      {items.length}
                    </span>
                  </div>

                  {/* Tarjetas de registros */}
                  <div className="grid gap-2 sm:grid-cols-2 pl-1">
                    {items.map(p => (
                      <PonchadoCard
                        key={p.id}
                        ponchado={p}
                        cardBg={cfg.cardBg}
                        cardBorder={cfg.cardBorder}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainDialog>
  );
}
