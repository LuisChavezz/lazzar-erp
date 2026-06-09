"use client";

import type { LocationSlot } from "../types/location-dashboard.types";

// ─── SVG Anillo de progreso ───────────────────────────────────────────────────

function RingChart({
  porcentaje,
  size = 120,
  strokeWidth = 10,
}: {
  porcentaje: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (porcentaje / 100) * circumference;

  const color =
    porcentaje >= 95
      ? "stroke-rose-500"
      : porcentaje >= 70
        ? "stroke-amber-500"
        : "stroke-emerald-500";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} transition-all duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-mono text-slate-800 dark:text-white">
          {porcentaje}%
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {porcentaje >= 95 ? "Lleno" : porcentaje >= 70 ? "Crítico" : "Disponible"}
        </span>
      </div>
    </div>
  );
}

// ─── Panel de detalle ─────────────────────────────────────────────────────────

interface LocationDetailPanelProps {
  slot: LocationSlot | null;
}

export function LocationDetailPanel({ slot }: LocationDetailPanelProps) {
  if (!slot) {
    return (
      <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-6 shadow-sm h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-400 dark:text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Selecciona una ubicación
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[200px]">
            Haz clic en cualquier bloque del panel para ver su detalle.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-6 shadow-sm space-y-6">
      {/* Título */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          Detalle de Ubicación
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {slot.nombre}
        </p>
      </div>

      {/* Anillo de ocupación */}
      <div className="flex justify-center">
        <RingChart porcentaje={slot.ocupacionPorcentaje} />
      </div>

      {/* Datos */}
      <div className="space-y-3">
        {slot.tipoMaterial && (
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-md bg-sky-50 dark:bg-sky-500/10 text-sky-500 mt-0.5">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                />
              </svg>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tipo de Material
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-white">
                {slot.tipoMaterial}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 mt-0.5">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6h.008v.008H6V6Z"
              />
            </svg>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SKUs Almacenados
            </span>
            <span className="text-sm font-medium text-slate-800 dark:text-white">
              {slot.skusCount} {slot.skusCount === 1 ? "Item" : "Items"}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-500 mt-0.5">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Último Movimiento
            </span>
            <span className="text-sm font-medium text-slate-800 dark:text-white">
              {slot.ultimoMovimiento}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de items */}
      {slot.items.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Artículos
          </h4>
          <ul className="space-y-2">
            {slot.items.map((item) => (
              <li
                key={item.sku}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5"
              >
                <div className="min-w-0">
                  <span className="block text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {item.sku}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {item.descripcion}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-black px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                  x{item.cantidad}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mensaje cuando no hay items */}
      {slot.items.length === 0 && slot.skusCount === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Sin artículos almacenados
          </p>
        </div>
      )}
    </div>
  );
}
