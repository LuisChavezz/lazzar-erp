"use client";

import type { RfidScannerStats as RfidScannerStatsData } from "../interfaces/rfid-scanner.interface";

/**
 * Umbral de "sin señal", en segundos. Es el mismo criterio que documenta el
 * backend para `scanner-stats` (>= 300 s ⇒ el FX se considera caído): cinco
 * minutos sin una sola lectura en una nave en operación significa que el lector
 * dejó de reportar, no que no pasó mercancía.
 */
const OFFLINE_THRESHOLD_SECONDS = 300;

/** "hace 12 s" / "hace 4 min" / "hace 2 h" / "hace 3 d". */
const formatSecondsAgo = (seconds: number): string => {
  if (seconds < 60) return `hace ${seconds} s`;
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  return `hace ${Math.floor(seconds / 86400)} d`;
};

interface RfidScannerStatsProps {
  /** `undefined` mientras carga o si la consulta falló — ver `isLoading`. */
  stats: RfidScannerStatsData | undefined;
  isLoading: boolean;
}

/**
 * Barra de estado del lector RFID. Traduce `last_scan_seconds_ago` a un
 * semáforo de dos estados (conectado / sin señal) y muestra el total de
 * lecturas almacenadas.
 *
 * Sin datos (`stats === undefined`) NO se pinta el punto rojo: que la consulta
 * de diagnóstico falle o siga en vuelo no es lo mismo que un lector caído, y un
 * indicador rojo mandaría a revisar una antena que quizá está bien. Ese caso se
 * muestra en gris, como lo que es: estado desconocido.
 *
 * `last_scan_seconds_ago` es una FOTO del momento en que se consultó
 * `scanner-stats`, no un contador vivo: el llamador la refresca al encender el
 * monitoreo (ver `RfidScannerView`).
 */
export function RfidScannerStats({ stats, isLoading }: RfidScannerStatsProps) {
  const secondsAgo = stats?.last_scan_seconds_ago ?? null;
  const isUnknown = stats === undefined;
  const isOnline = secondsAgo !== null && secondsAgo < OFFLINE_THRESHOLD_SECONDS;

  const dotClass = isUnknown
    ? "bg-slate-400"
    : isOnline
      ? "bg-emerald-500"
      : "bg-rose-500";

  const statusLabel = isUnknown
    ? isLoading
      ? "Consultando estado del lector..."
      : "Estado del lector desconocido"
    : isOnline
      ? "Lector conectado"
      : "Lector sin señal";

  const statusTextClass = isUnknown
    ? "text-slate-500 dark:text-slate-400"
    : isOnline
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          {/* El halo pulsante solo acompaña al estado "conectado": en gris o en
              rojo sugeriría actividad justo cuando no la hay. */}
          {isOnline && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotClass}`} />
        </span>
        <span className={`text-sm font-semibold ${statusTextClass}`}>{statusLabel}</span>
      </div>

      {secondsAgo !== null && (
        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <span>Última lectura</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {formatSecondsAgo(secondsAgo)}
          </span>
        </div>
      )}

      {stats && (
        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {stats.total_rfidscan_rows.toLocaleString("es-MX")}
          </span>
          <span>lecturas en base</span>
        </div>
      )}
    </div>
  );
}
