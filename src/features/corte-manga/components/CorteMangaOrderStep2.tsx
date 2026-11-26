"use client";

import { FormSecondaryButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Loader } from "@/src/components/Loader";
import { ExclamationTriangleIcon, InfoIcon } from "@/src/components/Icons";
import { MesaControlProgramadoIndicator } from "@/src/components/MesaControlProgramadoIndicator";
import { WorkOrderLinesTable } from "@/src/components/WorkOrderLinesTable";
import { formatPiezas } from "@/src/utils/formatWorkOrderProgramado";
import { useCorteMangaStep2Form } from "../hooks/useCorteMangaStep2Form";
import type { CreateCorteMangaOrderFormValues } from "../schemas/corte-manga-order.schema";

interface CorteMangaOrderStep2Props {
  header: CreateCorteMangaOrderFormValues;
  onBack: () => void;
  onSuccess: () => void;
  /**
   * Abre el diálogo de detalle (`CorteMangaOrderDetailDialog`, montado en
   * `CorteMangaOrdersView`) para el `id` dado. Lo usa el bloque de duplicado
   * (409) para llevar a la orden YA EXISTENTE, sin navegar.
   */
  onViewExistingOrder: (id: number) => void;
}

/**
 * Paso 2 del alta de orden de corte de manga (EC-967): qué prendas del pedido
 * entran en esta orden y con cuántas piezas. Es el ÚNICO punto de envío del
 * flujo, y siempre manda `detalles_override`, incluso cuando el usuario no
 * cambia nada: omitirlo enruta el POST por la vía del pedido completo, que
 * sobre un pedido programado solo en parte responde 400 y sobre uno cubierto,
 * 409. Gemelo de `ReflectiveOrderStep2`, sin el popover de configuración.
 *
 * Además del indicador de Mesa de Control (el mismo del Paso 1), muestra el
 * total capturado contra lo disponible: el tope es del pedido, no de la línea,
 * así que el total es lo que el usuario necesita ver mientras reparte piezas.
 */
export function CorteMangaOrderStep2({
  header,
  onBack,
  onSuccess,
  onViewExistingOrder,
}: CorteMangaOrderStep2Props) {
  const {
    pedido,
    saldo,
    rows,
    ceilings,
    availableRowsCount,
    selectedCount,
    checkedIds,
    quantities,
    toggleLine,
    toggleAll,
    setQuantity,
    isLoading,
    isError,
    isFetching,
    serverBanner,
    issueLines,
    dismissBanner,
    staleNotice,
    dismissStaleNotice,
    duplicate,
    dismissDuplicate,
    isPending,
    handleSubmit,
  } = useCorteMangaStep2Form({ header, onSuccess });

  if (isLoading) {
    return (
      <Loader
        className="py-12"
        title="Cargando prendas"
        message="Consultando qué prendas del pedido siguen pendientes de cortar..."
      />
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            No se pudieron cargar las prendas del pedido
          </p>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">
            Regresa e intenta seleccionar el pedido de nuevo.
          </p>
        </div>
        <div className="flex justify-start">
          <FormSecondaryButton label="Regresar" onClick={onBack} />
        </div>
      </div>
    );
  }

  /**
   * El pedido desapareció del catálogo (otra orden tomó lo programado o lo
   * pendiente mientras este formulario estaba abierto) o ya no queda nada por
   * programar en él.
   */
  const sinPendiente = pedido === null || rows.length === 0 || availableRowsCount === 0;

  // Total capturado en las líneas MARCADAS (las desmarcadas no viajan).
  let totalCapturado = 0;
  for (const id of checkedIds) {
    const cantidad = Number.parseInt(quantities.get(id) ?? "", 10);
    if (Number.isInteger(cantidad) && cantidad > 0) totalCapturado += cantidad;
  }
  const excedeDisponible = saldo !== null && totalCapturado > saldo.disponible;

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-white/5 px-4 py-3 text-xs">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Pedido</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
            {pedido?.folio ?? `Pedido #${header.pedido}`}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Cliente</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
            {pedido?.cliente_nombre ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Sucursal</p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
            {pedido?.sucursal_nombre ?? "—"}
          </p>
        </div>
      </div>

      {pedido && <MesaControlProgramadoIndicator programado={pedido.programado} saldo={saldo} />}

      {/* ── Bloque de duplicado (409) ─────────────────────────────────────
          Ámbar informativo, mutuamente excluyente con el banner rosa. */}
      {duplicate && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
        >
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {duplicate.message}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-700 dark:text-amber-300">
              <span>
                <span className="font-semibold">Orden existente: </span>
                <button
                  type="button"
                  onClick={() => onViewExistingOrder(duplicate.existingOrder.id)}
                  className="font-mono font-semibold hover:underline cursor-pointer"
                >
                  {/* Sin este respaldo, un folio vacío dejaría el botón sin
                      texto y la única vía hacia la orden existente invisible. */}
                  {duplicate.existingOrder.folio || `Orden #${duplicate.existingOrder.id}`}
                </button>
              </span>
              {duplicate.existingOrder.estado && (
                <span>
                  <span className="font-semibold">Estatus: </span>
                  {duplicate.existingOrder.estado}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={dismissDuplicate}
            aria-label="Descartar aviso"
            className="shrink-0 p-1 rounded-lg text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Aviso de dato desactualizado (no fatal) ─────────────────────── */}
      {staleNotice && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
        >
          <InfoIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-amber-800 dark:text-amber-200">{staleNotice}</p>
            {isFetching && (
              <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                Actualizando pendientes...
              </p>
            )}
          </div>
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

      {/* ── Banner de error + detalle por línea ─────────────────────────────
          Los mensajes del backend se muestran TAL CUAL, y `issueLines` COMPLETO
          (cuando viene del backend son los `detalles_exceso`). */}
      {serverBanner && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20 px-4 py-3"
        >
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{serverBanner}</p>
            {issueLines.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-rose-600 dark:text-rose-300/90">
                {issueLines.map((line, index) => (
                  <li key={index} className="tabular-nums whitespace-pre-wrap break-words">
                    {line.trim()}
                  </li>
                ))}
              </ul>
            )}
          </div>
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

      <fieldset disabled={isPending} className="space-y-3">
        {sinPendiente ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <InfoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {rows.length === 0
                  ? "Este pedido ya no tiene prendas por cortar"
                  : "No quedan piezas disponibles para otra orden"}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Otra orden de corte de manga pudo haber tomado lo programado mientras este
                formulario estaba abierto. Regresa para elegir otro pedido.
              </p>
            </div>
          </div>
        ) : (
          <>
            <WorkOrderLinesTable
              title="Prendas a cortar"
              quantityVerb="cortar"
              inputIdPrefix="corte-manga-line"
              rows={rows}
              ceilings={ceilings}
              checkedIds={checkedIds}
              quantities={quantities}
              availableRowsCount={availableRowsCount}
              selectedCount={selectedCount}
              onToggleLine={toggleLine}
              onToggleAll={toggleAll}
              onQuantityChange={setQuantity}
            />
            <p
              aria-live="polite"
              className={`text-right text-xs tabular-nums ${
                excedeDisponible
                  ? "font-semibold text-rose-600 dark:text-rose-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Esta orden lleva <strong>{formatPiezas(totalCapturado)}</strong>
              {saldo && <> de {formatPiezas(saldo.disponible)} disponibles</>}
            </p>
          </>
        )}
      </fieldset>

      {/* ── Aviso de permanencia ─────────────────────────────────────────
          La orden nace en Pendiente y consume folio; su estatus se cambia y se
          cancela desde la ficha (PATCH y `cancelar/`). Mismo tono que el aviso
          de bordado. */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
      >
        <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <p className="min-w-0 flex-1 text-xs text-amber-700 dark:text-amber-300">
          La orden se crea con estatus <strong>Pendiente</strong> y consume un folio de la
          serie. Podrás cambiar su estatus o cancelarla desde la ficha de la orden. Lo que
          dejes fuera seguirá pendiente y podrá programarse en otra orden.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <FormSecondaryButton label="Regresar" onClick={onBack} disabled={isPending} />
        {/* `disabled` DEBE incluir `isPending` (un `disabled` propio sobrescribe
            el interno de `FormSubmitButton`). `isFetching` también bloquea:
            mientras la recarga está en vuelo, los inputs muestran lo que el
            servidor rechazó. */}
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Creando..."
          disabled={isPending || isFetching || sinPendiente || selectedCount === 0}
        >
          Crear orden de corte de manga
        </FormSubmitButton>
      </div>
    </form>
  );
}
