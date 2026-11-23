"use client";

import type {
  RfidLector,
  RfidLectorEstado,
  RfidScannerStats as RfidScannerStatsData,
} from "../interfaces/rfid-scanner.interface";

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

const LECTOR_ESTADO: Record<RfidLectorEstado, { label: string; dot: string; text: string }> = {
  LEYENDO: {
    label: "Detectando etiquetas",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  CONECTADO_SIN_TAGS: {
    label: "Encendido, sin etiquetas",
    dot: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400",
  },
  SIN_CONEXION: {
    label: "Sin conexión",
    dot: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
  },
};

/** Un lector con su estado de heartbeat (nucleo-erp #1289). Es el estado del
 *  EQUIPO (el FX lee por su cuenta), no del botón "Iniciar escaneo" de esta
 *  pantalla: por eso la etiqueta dice "Lector" y no "Leyendo". */
function LectorChip({ lector }: { lector: RfidLector }) {
  // Sin heartbeat configurado en el FX ("Management Events" sin endpoint), el
  // equipo solo se reporta cuando una etiqueta ENTRA al campo: un lector
  // encendido y conectado, sin etiquetas nuevas, cae en SIN_CONEXION a los 5 min.
  // Si ya se había reportado antes no se puede afirmar que esté desconectado,
  // así que se muestra en ámbar como "sin actividad", no en rojo.
  const sinActividad = lector.estado === "SIN_CONEXION" && lector.ultima_conexion !== null;
  const tone = sinActividad
    ? { label: "", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }
    : (LECTOR_ESTADO[lector.estado] ?? LECTOR_ESTADO.SIN_CONEXION);
  const detalle =
    lector.estado === "SIN_CONEXION"
      ? lector.ultima_conexion === null
        ? "El lector nunca se ha reportado: revisa la red o el DNS del FX"
        : `Sin etiquetas nuevas desde ${formatSecondsAgo(lector.segundos_desde_conexion ?? 0)}`
      : `conexión ${formatSecondsAgo(lector.segundos_desde_conexion ?? 0)}`;
  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5"
      title={
        lector.segundos_desde_lectura === null
          ? `Estado del equipo ${lector.nombre} (independiente de "Iniciar escaneo"): sin lecturas registradas`
          : `Estado del equipo ${lector.nombre} (independiente de "Iniciar escaneo"): última lectura ${formatSecondsAgo(lector.segundos_desde_lectura)}`
      }
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        {lector.estado === "LEYENDO" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${tone.dot}`} />
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">Lector</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{lector.nombre}</span>
      {lector.estado !== "SIN_CONEXION" && (
        <span className={`text-xs font-semibold ${tone.text}`}>{tone.label}</span>
      )}
      <span
        className={`text-xs ${lector.estado === "SIN_CONEXION" ? `font-semibold ${tone.text}` : "text-slate-500 dark:text-slate-400"}`}
      >
        {lector.estado === "SIN_CONEXION" ? detalle : `· ${detalle}`}
      </span>
    </div>
  );
}

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
 * `scanner-stats`, no un contador vivo: se renueva cada 30 s, con o sin escaneo; antes:
 * monitoreo está encendido (ver `useRfidScannerStats`).
 */
export function RfidScannerStats({ stats, isLoading }: RfidScannerStatsProps) {
  // Con heartbeat (#1289) cada lector dice si está apagado, conectado sin tags
  // o leyendo; el semáforo por "última lectura" queda para backends sin él.
  const lectores = stats?.lectores?.filter((l) => l.activo) ?? [];
  if (lectores.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 shadow-sm">
        {lectores.map((lector) => (
          <LectorChip key={lector.id} lector={lector} />
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
            {stats!.total_rfidscan_rows.toLocaleString("es-MX")}
          </span>
          <span>lecturas en base</span>
        </div>
      </div>
    );
  }

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
