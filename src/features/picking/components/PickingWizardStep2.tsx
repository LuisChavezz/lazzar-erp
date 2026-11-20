"use client";

import { avancePorDestino } from "../utils/pickingProgramacionAvance";
import { getProgramacionDestinoLabel } from "../utils/pickingDestino";
import {
  FormSecondaryButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { Loader } from "@/src/components/Loader";
import { PickingLinesPanel } from "./PickingLinesPanel";
import {
  ExclamationTriangleIcon,
  InfoIcon,
} from "@/src/components/Icons";
import { plural } from "@/src/utils/plural";
import { usePickingStep2Form } from "../hooks/usePickingStep2Form";
import type { PickingHeaderValues } from "../schemas/picking.schema";

interface PickingWizardStep2Props {
  header: PickingHeaderValues;
  onBack: () => void;
  onSuccess: () => void;
}

export function PickingWizardStep2({
  header,
  onBack,
  onSuccess,
}: PickingWizardStep2Props) {
  const {
    rows,
    limits,
    overAllocations,
    pendingRowsCount,
    capturableRowsCount,
    pedido,
    almacenNombre,
    almacenDestinoNombre,
    isLoading,
    isError,
    pedidoLoadError,
    quantities,
    observaciones,
    setQuantity,
    setObservacion,
    selectedCount,
    serverBanner,
    dismissBanner,
    staleNotice,
    dismissStaleNotice,
    isPending,
    handleSubmit,
  } = usePickingStep2Form({ header, onSuccess });

  if (isLoading) {
    return (
      <Loader
        className="py-12"
        title="Cargando pendientes"
        message="Consultando lo que queda por surtir de este pedido..."
      />
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            No se pudieron cargar los pendientes del pedido
          </p>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">
            {pedidoLoadError
              ? `${pedidoLoadError} Regresa y elige otro pedido.`
              : "Regresa e intenta seleccionar el pedido de nuevo."}
          </p>
        </div>
        <div className="flex justify-start">
          <FormSecondaryButton label="Regresar" onClick={onBack} />
        </div>
      </div>
    );
  }

  const noPending = rows.length === 0 || pendingRowsCount === 0;

  // Avance de la programación elegida en el Paso 1 contra lo que se captura
  // aquí. Pasarse NO bloquea (nucleo-erp#1279): solo se avisa.
  const programacion = avancePorDestino(pedido?.programaciones ?? []).find(
    (a) => a.destino === header.programacion_destino,
  );
  const capturado = Object.values(quantities).reduce((acc, v) => acc + (Number.parseFloat(v) || 0), 0);
  // El pedido SÍ tiene pendientes, pero ninguna línea tiene existencia con la
  // que surtirlos. Sin este caso la pantalla quedaría con todas las filas
  // deshabilitadas y el botón muerto, sin decir por qué.
  const sinExistencia = !noPending && capturableRowsCount === 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void handleSubmit();
      }}
      className="w-full space-y-5"
    >
      {/* ── Resumen del encabezado capturado ────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-50 dark:bg-white/5 px-4 py-2.5 text-xs">
        <span className="font-mono font-bold text-sky-700 dark:text-sky-300">{pedido?.folio ?? "—"}</span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200">{pedido?.cliente_nombre ?? "—"}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 px-2.5 py-0.5 text-[11px] text-slate-600 dark:text-slate-300">
          {almacenNombre} <span aria-label="hacia">→</span> <b className="text-slate-800 dark:text-slate-100">{almacenDestinoNombre}</b>
        </span>
      </div>

      {programacion && !noPending && (
        <ProgramacionCounter
          label={getProgramacionDestinoLabel(programacion.destino)}
          programado={programacion.cantidad}
          yaSurtido={programacion.surtido}
          capturado={capturado}
        />
      )}

      {/* ── Aviso de dato desactualizado (no fatal) ─────────────────────── */}
      {staleNotice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
        >
          <InfoIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p className="min-w-0 flex-1 text-sm text-amber-800 dark:text-amber-200">{staleNotice}</p>
          <button
            type="button"
            onClick={dismissStaleNotice}
            aria-label="Descartar aviso"
            className="shrink-0 p-1 rounded-lg text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Banner de error del backend ─────────────────────────────────── */}
      {serverBanner && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20 px-4 py-3"
        >
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <p className="min-w-0 flex-1 text-sm font-semibold text-rose-700 dark:text-rose-300">{serverBanner}</p>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Descartar aviso"
            className="shrink-0 p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Exceso sobre existencia COMPARTIDA entre tallas ─────────────── */}
      {/* Reactivo (no espera al envío): cada fila respeta su propio techo pero
          la suma del grupo no cabe en la existencia que comparten. Es el envío
          que el backend rechazaría de forma determinista. */}
      {overAllocations.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
        >
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="min-w-0 flex-1 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold">Varias tallas comparten la misma existencia</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {overAllocations.map((over) => (
                <li key={over.stockKey} className="tabular-nums">
                  «{over.nombre}»: capturaste {over.solicitado}, pero solo hay{" "}
                  {over.disponible} {plural(over.disponible, "disponible", "disponibles")} para todas sus tallas.
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <fieldset disabled={isPending} className="space-y-5">
        {noPending || sinExistencia ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <InfoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {sinExistencia
                  ? "No hay existencia disponible para surtir este pedido"
                  : rows.length === 0
                    ? "Este pedido no tiene tallas registradas"
                    : "Este pedido ya no tiene tallas pendientes por surtir"}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                {sinExistencia
                  ? `El pedido sigue con tallas pendientes, pero el almacén ${almacenNombre} no tiene piezas libres (la existencia está en cero o comprometida por reservas de inventario activas).`
                  : "Regresa para elegir otro pedido."}
              </p>
            </div>
          </div>
        ) : (
          <PickingLinesPanel
            rows={rows}
            limits={limits}
            quantities={quantities}
            observaciones={observaciones}
            setQuantity={setQuantity}
            setObservacion={setObservacion}
          />
        )}
      </fieldset>

      {/* ── Botones ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <FormSecondaryButton label="Regresar" onClick={onBack} disabled={isPending} />
        {/* `disabled` DEBE incluir `isPending`: `FormSubmitButton` esparce
            `{...props}` después de su `disabled` interno, así que un `disabled`
            propio lo sobrescribe — hay que "hornear" el pending aquí para que el
            botón quede realmente inhabilitado durante el envío (sin doble POST). */}
        {/* `overAllocations` bloquea el envío: ese payload lo rechazaría el
            backend siempre, y su rechazo no se recupera recargando. */}
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Registrando..."
          disabled={isPending || selectedCount === 0 || overAllocations.length > 0}
        >
          Registrar surtido
        </FormSubmitButton>
      </div>
    </form>
  );
}

/**
 * "Para Bordado: 10 ya surtidas + 8 en este surtido = 18 de 20". La barra
 * muestra lo previo (tenue) y lo de este surtido (fuerte); al pasarse se pone
 * ámbar y dice por cuánto, sin bloquear.
 */
function ProgramacionCounter({
  label,
  programado,
  yaSurtido,
  capturado,
}: {
  label: string;
  programado: number;
  yaSurtido: number;
  capturado: number;
}) {
  const total = yaSurtido + capturado;
  const excede = total - programado;
  const pendienteAntes = Math.max(0, programado - yaSurtido);
  const base = Math.max(programado, total, 1);
  const fmt = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 4 });
  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 ${
        excede > 0
          ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-900/20"
          : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/2"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <p className="text-slate-600 dark:text-slate-300">
          Para <b className="text-slate-900 dark:text-white">{label}</b>: {fmt(yaSurtido)} ya surtidas
          {capturado > 0 && (
            <>
              {" + "}
              <b className="text-sky-700 dark:text-sky-300">{fmt(capturado)}</b> en este surtido
            </>
          )}
        </p>
        <p className="tabular-nums font-bold text-slate-900 dark:text-white">
          {fmt(total)} <span className="font-normal text-slate-500">de {fmt(programado)}</span>
        </p>
      </div>
      <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <span className="h-full bg-slate-400 dark:bg-slate-500" style={{ width: `${(Math.min(yaSurtido, base) / base) * 100}%` }} />
        <span
          className={`h-full ${excede > 0 ? "bg-amber-500" : "bg-sky-500"} transition-all duration-200`}
          style={{ width: `${(capturado / base) * 100}%` }}
        />
      </div>
      <p className={`mt-1.5 text-[11px] ${excede > 0 ? "font-semibold text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}>
        {excede > 0
          ? `Te pasas por ${fmt(excede)} de lo programado. Se registrará igual.`
          : capturado === 0
            ? `Faltan ${fmt(pendienteAntes)} por surtir para esta programación.`
            : total === programado
              ? "Con este surtido queda cubierta la programación."
              : `Quedarían ${fmt(programado - total)} por surtir.`}
      </p>
    </div>
  );
}
