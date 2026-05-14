"use client";
// Vista visual del rack de bordado por nivel
import type { EmbroideryOrder, NivelRack } from "../interfaces/embroidery-order.interface";

// Configuración de niveles del rack (1 = superior, 2 = medio, 3 = inferior)
const NIVELES_CFG: {
  nivel: NivelRack;
  numero: number;
  label: string;
  cabezas: number;
  borderCls: string;
  bgCls: string;
  ringCls: string;
  slotBg: string;
  slotText: string;
  slotDot: string;
  badgeBg: string;
}[] = [
  {
    nivel: 'superior',
    numero: 1,
    label: 'Nivel Superior',
    cabezas: 2,
    borderCls: 'border-amber-300/70 dark:border-amber-500/30',
    bgCls: 'bg-amber-50/40 dark:bg-amber-500/5',
    ringCls: 'text-amber-500 border-amber-400',
    slotBg: 'bg-amber-50 dark:bg-amber-500/15',
    slotText: 'text-amber-800 dark:text-amber-300',
    slotDot: 'bg-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
  },
  {
    nivel: 'medio',
    numero: 2,
    label: 'Nivel Medio',
    cabezas: 4,
    borderCls: 'border-rose-300/70 dark:border-rose-500/30',
    bgCls: 'bg-rose-50/40 dark:bg-rose-500/5',
    ringCls: 'text-rose-500 border-rose-400',
    slotBg: 'bg-rose-50 dark:bg-rose-500/15',
    slotText: 'text-rose-800 dark:text-rose-300',
    slotDot: 'bg-rose-500',
    badgeBg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20',
  },
  {
    nivel: 'inferior',
    numero: 3,
    label: 'Nivel Inferior',
    cabezas: 6,
    borderCls: 'border-orange-300/70 dark:border-orange-500/30',
    bgCls: 'bg-orange-50/40 dark:bg-orange-500/5',
    ringCls: 'text-orange-500 border-orange-400',
    slotBg: 'bg-orange-50 dark:bg-orange-500/15',
    slotText: 'text-orange-800 dark:text-orange-300',
    slotDot: 'bg-orange-400',
    badgeBg: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20',
  },
];

// Colores de estatus para las tarjetas dentro de cada slot
const ESTATUS_SLOT: Record<string, { dot: string; badge: string }> = {
  liberada:   { dot: 'bg-indigo-500',  badge: 'text-indigo-700 dark:text-indigo-300' },
  en_proceso: { dot: 'bg-orange-400',  badge: 'text-orange-700 dark:text-orange-300' },
  terminada:  { dot: 'bg-teal-500',    badge: 'text-teal-700 dark:text-teal-300' },
};

// Leyenda de estatus (solo los que pueden estar en rack)
const LEYENDA = [
  { key: 'liberada',   label: 'Liberada',    cls: 'bg-indigo-500' },
  { key: 'en_proceso', label: 'En Proceso',  cls: 'bg-orange-400' },
  { key: 'terminada',  label: 'Terminada',   cls: 'bg-teal-500' },
];

interface EmbroideryRackViewProps {
  orders: EmbroideryOrder[];
}

export function EmbroideryRackView({ orders }: EmbroideryRackViewProps) {
  // Solo órdenes con rack_slot asignado
  const ordenesConRack = orders.filter(o => o.rack_slot !== null);

  // Retorna las órdenes de un nivel, ordenadas de izquierda a derecha
  // (criterio: fecha de entrega más próxima primero, luego posición asignada)
  const ordenesDeNivel = (nivel: NivelRack) =>
    ordenesConRack
      .filter(o => o.rack_slot?.nivel === nivel)
      .sort((a, b) => {
        const fa = a.fecha_entrega_pedido ?? a.fecha_entrega_parcialidad ?? '9999-99-99';
        const fb = b.fecha_entrega_pedido ?? b.fecha_entrega_parcialidad ?? '9999-99-99';
        if (fa !== fb) return fa < fb ? -1 : 1;
        return (a.rack_slot?.posicion ?? 0) - (b.rack_slot?.posicion ?? 0);
      });

  const totalEnRack = ordenesConRack.length;

  return (
    <div className="space-y-5 pb-2">

      {/* ── Cabecera informativa ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
          La selección de pedidos sigue un criterio ordenado que combina{' '}
          <strong className="text-slate-700 dark:text-slate-300">fechas de entrega</strong> y la{' '}
          <strong className="text-slate-700 dark:text-slate-300">capacidad de cada máquina</strong>{' '}
          según el nivel del rack asignado. Los pedidos se leen de{' '}
          <strong className="text-slate-700 dark:text-slate-300">izquierda a derecha</strong>,
          priorizando la fecha más próxima de entrega.
        </p>
        {/* Leyenda de estatus */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
          {LEYENDA.map(l => (
            <span key={l.key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${l.cls}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Niveles del rack ──────────────────────────────────────────── */}
      <div className="space-y-4">
        {NIVELES_CFG.map(cfg => {
          const ordenes = ordenesDeNivel(cfg.nivel);
          return (
            <div key={cfg.nivel} className="space-y-2">

              {/* Encabezado del nivel */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${cfg.ringCls}`}
                >
                  {cfg.numero}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">
                    {cfg.label}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Máquinas de <span className="font-semibold">{cfg.cabezas} cabezas</span>
                    {' · '}
                    <span className="font-medium">{ordenes.length}</span> orden{ordenes.length !== 1 ? 'es' : ''} asignada{ordenes.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Carril visual del nivel */}
              <div
                className={`rounded-2xl border-2 p-3 min-h-21 ${cfg.borderCls} ${cfg.bgCls}`}
              >
                {ordenes.length === 0 ? (
                  <div className="flex items-center justify-center h-14 text-xs text-slate-400 dark:text-slate-500 italic">
                    Nivel vacío — sin órdenes asignadas
                  </div>
                ) : (
                  /* Tarjetas de órdenes — orden izquierda a derecha por fecha */
                  <div className="flex flex-wrap gap-2">
                    {ordenes.map((orden, posIdx) => {
                      const estatusCfg = ESTATUS_SLOT[orden.estatus_hoja] ?? ESTATUS_SLOT.liberada;
                      const fechaEntrega = orden.fecha_entrega_pedido ?? orden.fecha_entrega_parcialidad;
                      return (
                        <div
                          key={orden.id}
                          className={`
                            flex flex-col gap-0.5 px-3 py-2.5 rounded-xl border
                            min-w-32 max-w-48 shrink-0
                            ${cfg.slotBg} border-current/20
                          `}
                          title={`${orden.numero_orden} · ${orden.cliente}`}
                        >
                          {/* Posición + número de orden */}
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`
                                w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0
                                ${cfg.slotBg} ${cfg.slotText} border border-current/20
                              `}
                            >
                              {posIdx + 1}
                            </span>
                            <span className={`font-mono text-[11px] font-bold ${cfg.slotText}`}>
                              {orden.numero_orden}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ml-auto shrink-0 ${estatusCfg.dot}`} />
                          </div>
                          {/* Pedido */}
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {orden.pedido}
                          </span>
                          {/* Fecha de entrega */}
                          {fechaEntrega && (
                            <span className={`text-[10px] font-medium ${estatusCfg.badge} opacity-80`}>
                              ent.{' '}
                              {new Date(fechaEntrega + 'T00:00:00').toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Resumen por nivel ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {NIVELES_CFG.map(cfg => (
          <div
            key={cfg.nivel}
            className={`rounded-xl p-3.5 border text-center ${cfg.badgeBg}`}
          >
            <p className="text-xl font-bold text-slate-800 dark:text-white tabular-nums">
              {ordenesDeNivel(cfg.nivel).length}
            </p>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
              {cfg.label}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {cfg.cabezas} cabezas
            </p>
          </div>
        ))}
      </div>

      {/* Total en rack */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-500 pb-1">
        {totalEnRack} orden{totalEnRack !== 1 ? 'es' : ''} en rack de {orders.length} totales
      </p>
    </div>
  );
}
