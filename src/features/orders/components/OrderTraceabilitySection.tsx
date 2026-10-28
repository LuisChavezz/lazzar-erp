import { useId, useState } from "react";
import { SheetSection } from "./OrderSheetPrimitives";
import { CheckIcon, ChevronDownIcon, WarningFilledIcon, RouteIcon } from "@/src/components/Icons";
import { Loader } from "@/src/components/Loader";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";
import { RowProgressBar } from "@/src/components/ProgressPrimitives";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { ORIGIN_BADGE_CLASS } from "../constants/pedidoStatus";
import {
  getOrdenDocTipo,
  getTrazabilidadEstadoConfig,
  getTrazabilidadPasoLabel,
  getTrazabilidadSemaforoConfig,
} from "../constants/pedidoTrazabilidad";
import { usePedidoTrazabilidad } from "../hooks/usePedidoTrazabilidad";
import type {
  TrazabilidadEstado,
  TrazabilidadOrden,
  TrazabilidadPaso,
  TrazabilidadPasoMaquila,
  TrazabilidadProceso,
} from "../interfaces/pedido-trazabilidad.interface";
import { formatDiasRestantes, formatFechaCalendario, formatPedidoPct } from "../utils/pedidoFormat";
import { hasOrderDocumentDialog, type OpenOrderDocument } from "./orderDocumentDialogs";

const SECTION_TITLE = "Trazabilidad";

const FOLIO_BUTTON_CLASS =
  "font-mono font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline cursor-pointer text-left transition-colors";

/**
 * Badge de un valor del backend con la entrada YA resuelta por su getter (con
 * respaldo neutro). Se le pasa a `StatusBadge` un config de una sola llave para
 * que nunca indexe el `Record` completo con un valor desconocido.
 */
function TrazabilidadBadge({ value, entry }: { value: string; entry: StatusBadgeConfigEntry }) {
  return <StatusBadge status={value} config={{ [value]: entry }} />;
}

/** Lo que pintan por igual un paso y un proceso de maquila. */
interface AvanceView {
  estado: TrazabilidadEstado;
  pct: number | null;
  hecho: number | null;
  total: number | null;
}

/**
 * Estado, piezas y avance de un paso o proceso. "No aplica" lo dice el propio
 * badge y no lleva porcentaje. `complete` sale del `estado` del backend, no de
 * comparar el número: así una barra verde solo afirma lo que el backend afirma.
 */
function AvanceCells({ avance }: { avance: AvanceView }) {
  const { estado, pct, hecho, total } = avance;
  return (
    <>
      <TrazabilidadBadge value={estado} entry={getTrazabilidadEstadoConfig(estado)} />
      <span className="ml-auto flex items-center gap-4">
        {hecho !== null && total !== null && (
          <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {formatQuantityValue(hecho)} / {formatQuantityValue(total)} pzas
          </span>
        )}
        {estado !== "no_aplica" && pct !== null && (
          <span className="text-xs">
            <RowProgressBar percentage={pct} complete={estado === "completo"} />
          </span>
        )}
      </span>
    </>
  );
}

/**
 * Orden de trabajo vigente del proceso. El folio abre el MISMO diálogo que en
 * "Documentos relacionados" (registro `ORDER_DOCUMENT_DIALOGS`), nunca una
 * ruta: la regla `/orders` ya es el control de acceso de esos diálogos. Un
 * `tipo` sin diálogo (uno nuevo del backend) deja el folio como texto: un
 * enlace que no abre nada sería peor que ninguno.
 *
 * La barra NUNCA se marca completa: la orden no trae `estado`, y su `pct` llega
 * a 100 sin que la orden esté terminada (avances iguales a lo cubierto, o el
 * redondeo de 99.95). Su estatus real es `estatus_label`.
 */
function OrdenRow({
  orden,
  onOpenOrden,
}: {
  orden: TrazabilidadOrden;
  onOpenOrden: (doc: OpenOrderDocument) => void;
}) {
  const folio = orden.folio || `#${orden.id}`;
  const docTipo = getOrdenDocTipo(orden.tipo);
  // Llave del diálogo a abrir, o `null` si no hay ninguno registrado.
  const openTipo = docTipo !== null && hasOrderDocumentDialog(docTipo) ? docTipo : null;
  return (
    <li
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg px-3 py-2 ${
        orden.detenida
          ? "bg-red-50 dark:bg-red-500/10 ring-1 ring-red-200 dark:ring-red-500/20"
          : "bg-slate-50/70 dark:bg-white/[0.03]"
      }`}
    >
      {openTipo !== null ? (
        <button
          type="button"
          onClick={() => onOpenOrden({ tipo: openTipo, id: orden.id })}
          className={`${FOLIO_BUTTON_CLASS} text-xs`}
          title="Ver detalle"
        >
          {folio}
        </button>
      ) : (
        <span className="font-mono font-medium text-xs text-slate-700 dark:text-slate-200">
          {folio}
        </span>
      )}
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${ORIGIN_BADGE_CLASS}`}
      >
        {orden.estatus_label}
      </span>
      {orden.detenida && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-red-400">
          <WarningFilledIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Detenida
        </span>
      )}
      <span className="ml-auto text-xs">
        <RowProgressBar percentage={orden.pct} />
      </span>
    </li>
  );
}

function ProcesoRow({
  proceso,
  onOpenOrden,
}: {
  proceso: TrazabilidadProceso;
  onOpenOrden: (doc: OpenOrderDocument) => void;
}) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="w-36 shrink-0 text-xs font-medium text-slate-700 dark:text-slate-200">
          {proceso.label}
        </span>
        <AvanceCells avance={proceso} />
      </div>
      {proceso.sin_orden > 0 && (
        <p className="mt-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
          {formatQuantityValue(proceso.sin_orden)} pzas sin orden
        </p>
      )}
      {proceso.ordenes.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {proceso.ordenes.map((orden) => (
            <OrdenRow key={`${orden.tipo}-${orden.id}`} orden={orden} onOpenOrden={onOpenOrden} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Paso de maquila: se despliega para mostrar sus procesos y órdenes. */
function MaquilaStep({
  paso,
  onOpenOrden,
}: {
  paso: TrazabilidadPasoMaquila;
  onOpenOrden: (doc: OpenOrderDocument) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="w-36 shrink-0 inline-flex items-center gap-1.5 text-left text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer transition-colors"
        >
          <ChevronDownIcon
            className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          {getTrazabilidadPasoLabel(paso)}
        </button>
        <AvanceCells avance={paso} />
      </div>
      {expanded && (
        <ul
          id={panelId}
          className="mx-4 mb-3 rounded-xl border border-slate-100 dark:border-white/10 px-4 py-3 divide-y divide-slate-100 dark:divide-white/10"
        >
          {paso.procesos.map((proceso) => (
            <ProcesoRow key={proceso.clave} proceso={proceso} onOpenOrden={onOpenOrden} />
          ))}
        </ul>
      )}
    </>
  );
}

function PasoRow({
  paso,
  onOpenOrden,
}: {
  paso: TrazabilidadPaso;
  onOpenOrden: (doc: OpenOrderDocument) => void;
}) {
  if (paso.clave === "maquila") return <MaquilaStep paso={paso} onOpenOrden={onOpenOrden} />;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      {/* Mismo ancho y sangría que el botón de Maquila (chevron incluido). */}
      <span className="w-36 shrink-0 pl-[22px] text-sm font-medium text-slate-800 dark:text-slate-100">
        {getTrazabilidadPasoLabel(paso)}
      </span>
      <AvanceCells avance={paso} />
    </div>
  );
}

/** Anillo de avance (SVG): el porcentaje operativo del pedido, al centro. */
function ProgressRing({ pct, tone }: { pct: number; tone: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} className="fill-none stroke-slate-200 dark:stroke-white/10" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          className={`fill-none ${tone} transition-all duration-700`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums text-slate-900 dark:text-white">
        {formatPedidoPct(clamped)}%
      </span>
    </div>
  );
}

/** Aspecto de un paso en el rastreador según su `estado` del backend. */
const TRACKER_STEP_STYLE: Record<TrazabilidadEstado, { dot: string; label: string }> = {
  completo: { dot: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30", label: "text-slate-800 dark:text-white" },
  en_proceso: { dot: "bg-sky-500 text-white ring-4 ring-sky-500/20 shadow-sm shadow-sky-500/30", label: "text-sky-700 dark:text-sky-300" },
  detenido: { dot: "bg-red-500 text-white ring-4 ring-red-500/20", label: "text-red-700 dark:text-red-400" },
  pendiente: { dot: "bg-white dark:bg-zinc-800 text-slate-400 border-2 border-slate-200 dark:border-white/15", label: "text-slate-500 dark:text-slate-400" },
  no_aplica: { dot: "bg-transparent text-slate-300 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-white/10", label: "text-slate-400 dark:text-slate-500" },
};

/**
 * Rastreador del pedido: los pasos como un recorrido en línea (estilo "pizza
 * tracker"), con una línea que se llena hasta el último paso cumplido o en
 * curso. Solo PINTA los `estado` y `pct` del backend: no recalcula nada.
 */
function PedidoTracker({ pasos, pasoActual }: { pasos: TrazabilidadPaso[]; pasoActual: string }) {
  const visibles = pasos;
  // La línea se llena hasta el último paso que ya arrancó (completo o en curso).
  const lastReached = visibles.reduce(
    (last, paso, index) =>
      paso.estado === "completo" || paso.estado === "en_proceso" || paso.estado === "detenido"
        ? index
        : last,
    -1,
  );
  const fill = visibles.length > 1 ? (Math.max(0, lastReached) / (visibles.length - 1)) * 100 : 0;

  return (
    <div className="relative px-2 pt-1">
      {/* Línea base y línea llena, detrás de los círculos. */}
      <div className="absolute left-[calc(100%/12)] right-[calc(100%/12)] top-[1.15rem] h-1 rounded-full bg-slate-200 dark:bg-white/10" aria-hidden="true">
        <div
          className="h-full rounded-full bg-linear-to-r from-emerald-500 to-sky-500 transition-all duration-700"
          style={{ width: `${fill}%` }}
        />
      </div>
      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${visibles.length}, minmax(0, 1fr))` }}>
        {visibles.map((paso, index) => {
          const style = TRACKER_STEP_STYLE[paso.estado];
          const isCurrent = paso.clave === pasoActual;
          return (
            <li key={paso.clave} className="flex flex-col items-center text-center gap-1.5 min-w-0">
              <span
                className={`relative grid place-items-center w-8 h-8 rounded-full text-xs font-bold transition-all ${style.dot}`}
                aria-hidden="true"
              >
                {paso.estado === "en_proceso" && (
                  <span className="absolute inset-0 rounded-full bg-sky-500/40 animate-ping motion-reduce:animate-none" />
                )}
                <span className="relative">
                  {paso.estado === "completo" ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : paso.estado === "detenido" ? (
                    <WarningFilledIcon className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </span>
              </span>
              <span className={`block w-full truncate text-[11px] font-semibold ${style.label} ${isCurrent ? "underline decoration-2 underline-offset-4 decoration-sky-500" : ""}`}>
                {getTrazabilidadPasoLabel(paso)}
              </span>
              <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                {paso.estado === "no_aplica" ? "No aplica" : paso.pct === null ? "—" : `${formatPedidoPct(paso.pct)}%`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface OrderTraceabilitySectionProps {
  pedidoId: number;
  /**
   * Pedido cancelado según el estatus LOCAL del detalle (el mismo que el badge
   * de la cabecera de la hoja), no según `pedido.estatus_label` del endpoint.
   */
  isCancelled: boolean;
  /** `canSeeAccounting` del detalle: gobierna el % cobrado. */
  showAccounting: boolean;
  /** Abre una orden de trabajo en su diálogo de detalle (estado de la página). */
  onOpenOrden: (doc: OpenOrderDocument) => void;
}

/**
 * Trazabilidad del pedido (`GET /ventas/pedidos/{id}/trazabilidad/`): semáforo,
 * paso actual, avance, entrega máxima y los seis pasos con su estado. Todo es
 * el valor del backend tal cual; aquí no se recalcula ningún porcentaje, total
 * ni color.
 *
 * Tiene su propia consulta, así que carga y falla por su cuenta sin tocar el
 * resto de la hoja. Mientras carga o si falla no hay ningún control accionable
 * salvo "Reintentar".
 *
 * Qué NO se pinta, a propósito:
 * - `pedido.folio`/`cliente`/`clasificacion`/`estatus_label`: la página ya los
 *   muestra desde el detalle, y `estatus_label` usa otro vocabulario.
 * - `pedido.total_piezas` suelto: los totales solo aparecen dentro de cada paso.
 * - `resumen.facturado_pct`: cuenta solo facturas EMITIDAS, mientras que el
 *   "Avance facturado" del seguimiento de factura cuenta también Borradores.
 *   Con bases distintas, dos pantallas darían dos cifras para "lo facturado".
 */
export function OrderTraceabilitySection({
  pedidoId,
  isCancelled,
  showAccounting,
  onOpenOrden,
}: OrderTraceabilitySectionProps) {
  const { data, isInitialError, isFetching, refetch } = usePedidoTrazabilidad(pedidoId);

  if (isInitialError) {
    return (
      <SheetSection
      icon={<RouteIcon className="w-5 h-5" />}
      title={SECTION_TITLE}
      subtitle="Dónde va el pedido y qué tan avanzado está cada paso."
    >
        <SectionErrorNotice
          title="No se pudo cargar la trazabilidad"
          message="El resto del pedido sigue disponible. Intenta de nuevo en unos momentos."
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      </SheetSection>
    );
  }

  if (!data) {
    return (
      <SheetSection
      icon={<RouteIcon className="w-5 h-5" />}
      title={SECTION_TITLE}
      subtitle="Dónde va el pedido y qué tan avanzado está cada paso."
    >
        <Loader
          className="py-8"
          title="Cargando trazabilidad"
          message="Calculando el avance del pedido..."
        />
      </SheetSection>
    );
  }

  const { pedido, resumen, pasos } = data;
  const pasoActual = pasos.find((paso) => paso.clave === resumen.paso_actual);
  const semaforoConfig = getTrazabilidadSemaforoConfig(resumen.semaforo);
  // Los días se cuentan contra HOY, no contra una entrega real: con el pedido
  // cerrado (todo embarcado o cancelado) ya no significan nada y solo queda la
  // fecha.
  const isClosed = isCancelled || resumen.semaforo === "terminado";
  const diasRestantes = isClosed ? null : formatDiasRestantes(pedido.dias_restantes);
  const vencido = pedido.dias_restantes !== null && pedido.dias_restantes < 0;

  return (
    <SheetSection
      icon={<RouteIcon className="w-5 h-5" />}
      title={SECTION_TITLE}
      subtitle="Dónde va el pedido y qué tan avanzado está cada paso."
    >
      {/* Tarjeta de estado (acabado tipo iOS): anillo con el avance
          operativo, el paso actual en grande y los datos clave como pastillas.
          Debajo, el rastreador de pasos. */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-linear-to-b from-slate-50 to-white dark:from-white/5 dark:to-transparent p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-4">
          {!isCancelled && (
            <ProgressRing
              pct={resumen.avance}
              tone={resumen.semaforo === "rojo" ? "stroke-red-500" : resumen.semaforo === "amarillo" ? "stroke-amber-500" : "stroke-emerald-500"}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isCancelled ? "Pedido cancelado" : "Paso actual"}
            </p>
            {!isCancelled && (
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {pasoActual ? getTrazabilidadPasoLabel(pasoActual) : "—"}
              </p>
            )}
            {/* Visible (no tooltip, para que se lea también en táctil): el
                backend promedia SOLO de Asignado a Embarcado, por eso puede
                marcar 0% aunque Confirmado o Programado avancen. */}
            {!isCancelled && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Avance operativo de Asignado a Embarcado
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TrazabilidadBadge value={resumen.semaforo} entry={semaforoConfig} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1 text-xs text-slate-600 dark:text-slate-300">
              <span className="text-slate-400">Entrega</span>
              <span className="font-semibold text-slate-800 dark:text-white">
                {pedido.fecha_compromiso ? formatFechaCalendario(pedido.fecha_compromiso) : "—"}
              </span>
              {diasRestantes && (
                <span className={vencido ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}>
                  · {diasRestantes}
                </span>
              )}
            </span>
            {showAccounting && (
              // `null` con acceso contable = el pedido no tiene CxC: "—", nunca 0%.
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Cobrado</span>
                <span className="font-semibold text-slate-800 dark:text-white">
                  {resumen.cobrado_pct === null ? "—" : `${formatPedidoPct(resumen.cobrado_pct)}%`}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className={`mt-5 ${isCancelled ? "opacity-60" : ""}`}>
          <PedidoTracker pasos={pasos} pasoActual={resumen.paso_actual} />
        </div>
      </div>

      {resumen.motivos.length > 0 && (
        <ul className="mt-4 space-y-1">
          {resumen.motivos.map((motivo, index) => (
            <li
              key={`${index}-${motivo}`}
              className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
            >
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${semaforoConfig.dot}`}
                aria-hidden="true"
              />
              {motivo}
            </li>
          ))}
        </ul>
      )}

      {/* Cancelado: los pasos siguen visibles pero atenuados, igual que una
          parcialidad cancelada en el seguimiento de factura. */}
      <p className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Detalle por paso
      </p>
      <ol
        className={`rounded-xl border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/10 ${
          isCancelled ? "opacity-60" : ""
        }`}
      >
        {pasos.map((paso) => (
          <li key={paso.clave}>
            <PasoRow paso={paso} onOpenOrden={onOpenOrden} />
          </li>
        ))}
      </ol>
    </SheetSection>
  );
}
