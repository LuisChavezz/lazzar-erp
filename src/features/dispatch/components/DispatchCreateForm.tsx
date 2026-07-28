"use client";

import { FormSubmitButton } from "@/src/components/FormButtons";
import { Loader } from "@/src/components/Loader";
import {
  ExclamationTriangleIcon,
  InfoIcon,
  RefreshIcon,
} from "@/src/components/Icons";
import { dispatchOnboardingErrorMessage } from "../hooks/useDispatchOnboarding";
import { useDispatchForm } from "../hooks/useDispatchForm";
import { DispatchLinesTable } from "./DispatchLinesTable";
import { DispatchPackingSelector } from "./DispatchPackingSelector";

interface DispatchCreateFormProps {
  /** Se invoca tras registrar el despacho correctamente (cierra el diálogo). */
  onSuccess: () => void;
}

/**
 * Captura de despacho en UN SOLO PASO.
 *
 * Decisión de arquitectura (deliberadamente distinta de picking/packing, que
 * sí usan `StepProgressBar` + `...StepManager`): el contrato de
 * `POST /wms/despachos/` recibe únicamente `{ packing, despacho_detalle }`, y
 * `despacho_detalle` no lleva cantidad ni ningún otro dato por línea. No hay
 * encabezado que capturar —ni cajas, ni peso, ni fechas, ni observaciones—,
 * así que un "Paso 1" cuyo único contenido sería el selector de packing no
 * agregaría ninguna decisión: solo una pantalla y un botón "Continuar" de más.
 * Con un solo paso, además, cambiar de packing es un clic en la lista (que
 * queda visible) en vez de un "Regresar". Mismo criterio —y mismo precedente—
 * que `CreateInvoiceDialog`, que documenta esta misma elección para un
 * endpoint igual de pequeño.
 *
 * NO existe selector de envío, a propósito: `Despacho.envio` es nullable en el
 * backend pero hoy no hay forma de crear un `Envio` fuera del admin de Django,
 * así que el selector llegaría siempre vacío y se leería como algo roto. Y
 * tampoco hay un flujo de "asociar envío después": `Despacho` no expone
 * `PATCH`/`PUT`, no hay endpoint detrás de ese botón. Lo que sí se hace es
 * DECIRLO — ver el aviso de permanencia junto al botón de registro.
 */
export function DispatchCreateForm({ onSuccess }: DispatchCreateFormProps) {
  const {
    selectedPackingId,
    selectPacking,
    packing,
    rows,
    availableRowsCount,
    alreadyDispatchedCount,
    checkedIds,
    toggleLine,
    toggleAll,
    selectedCount,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    serverBanner,
    dismissBanner,
    staleNotice,
    dismissStaleNotice,
    isPending,
    handleSubmit,
  } = useDispatchForm({ onSuccess });

  const hasPacking = selectedPackingId !== null;

  return (
    <div className="w-full space-y-5">
      {/* ── Selección del packing ────────────────────────────────────────
          Vive FUERA del <form>: su buscador es un input de texto, y dentro
          del formulario un Enter accidental ahí dispararía el envío implícito
          —registrando un despacho irreversible con una sola tecla—. Mismo
          motivo por el que `CreateInvoiceDialog` separa su selector. */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Packing a despachar
          </h3>
          <p className="text-[11px] text-slate-500">
            El pedido, el cliente y la sucursal se heredan del packing elegido.
          </p>
        </div>
        <DispatchPackingSelector
          selectedPackingId={selectedPackingId}
          onSelect={selectPacking}
          disabled={isPending}
        />
      </section>

      {hasPacking && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleSubmit();
          }}
          className="w-full space-y-5"
        >
          {/* ── Resumen del packing elegido ──────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 dark:bg-white/5 px-4 py-3 text-xs">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Packing
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                {packing?.folio ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Pedido
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                {packing?.pedido_folio ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Cliente
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                {packing?.cliente_nombre ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Almacén
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                {packing?.almacen_nombre ?? "—"}
              </p>
            </div>
          </div>

          {/* ── Aviso de dato desactualizado (no fatal) ───────────────────── */}
          {staleNotice && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
            >
              <InfoIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="min-w-0 flex-1 text-sm text-amber-800 dark:text-amber-200">
                {staleNotice}
              </p>
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

          {/* ── Banner de error del backend ──────────────────────────────── */}
          {serverBanner && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20 px-4 py-3"
            >
              <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <p className="min-w-0 flex-1 text-sm font-semibold text-rose-700 dark:text-rose-300">
                {serverBanner}
              </p>
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

          {/* ── Líneas del packing ───────────────────────────────────────── */}
          {isLoading ? (
            <Loader
              className="py-10"
              title="Cargando líneas"
              message="Consultando qué líneas de este packing se pueden despachar..."
            />
          ) : isError ? (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 space-y-3 text-center">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                No se pudieron cargar las líneas del packing
              </p>
              <p className="text-xs text-red-500 dark:text-red-300">
                {dispatchOnboardingErrorMessage(error)}
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:underline cursor-pointer"
              >
                <RefreshIcon className="w-3.5 h-3.5" />
                Reintentar
              </button>
            </div>
          ) : rows.length === 0 ? (
            <InfoPanel
              title="Este packing no tiene líneas registradas"
              subtitle="Elige otro packing de la lista de arriba."
            />
          ) : availableRowsCount === 0 ? (
            <InfoPanel
              title="Este packing ya fue despachado por completo"
              subtitle={`Sus ${alreadyDispatchedCount} línea${
                alreadyDispatchedCount === 1 ? "" : "s"
              } ya salieron en un despacho anterior. Elige otro packing de la lista de arriba.`}
            />
          ) : (
            <fieldset disabled={isPending} className="space-y-5">
              <DispatchLinesTable
                rows={rows}
                checkedIds={checkedIds}
                availableRowsCount={availableRowsCount}
                selectedCount={selectedCount}
                onToggleLine={toggleLine}
                onToggleAll={toggleAll}
              />
            </fieldset>
          )}

          {isFetching && !isLoading && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-right">
              Actualizando la disponibilidad de las líneas...
            </p>
          )}

          {/* ── Aviso de permanencia + botón de registro ──────────────────
              El aviso va PEGADO al botón, no arriba del formulario: es un
              punto de decisión único (se lee una vez, justo antes de
              registrar), no un estado que convenga repetir mientras se
              revisa la lista — arriba quedaría fuera de pantalla en cuanto
              la tabla crece. Solo se muestra cuando la acción es realmente
              alcanzable (hay líneas disponibles), para que no se lea como
              ruido en un packing que no se puede despachar.

              Tono informativo (ámbar), no de error (rojo): no se está
              haciendo nada mal, es una consecuencia del registro que hay que
              conocer antes de confirmarlo. */}
          {availableRowsCount > 0 && (
            <div
              role="note"
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
            >
              <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  El registro del despacho es definitivo
                </p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                  <li>
                    Las líneas que marques quedan despachadas de forma permanente: el sistema no
                    permite editarlas ni revertirlas después.
                  </li>
                  <li>
                    El despacho se registra sin envío ni transportista, y no es posible asociarlos
                    más adelante, así que no quedará registro de a quién se entregó la mercancía.
                  </li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            {/* `disabled` DEBE incluir `isPending`: `FormSubmitButton` esparce
                `{...props}` después de su `disabled` interno, así que un
                `disabled` propio lo sobrescribe — hay que "hornear" el pending
                aquí para que el botón quede realmente inhabilitado durante el
                envío (sin doble POST). */}
            <FormSubmitButton
              isPending={isPending}
              loadingLabel="Registrando..."
              disabled={isPending || selectedCount === 0}
            >
              Registrar despacho
            </FormSubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

/** Panel informativo ámbar para los casos sin nada que despachar. */
function InfoPanel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
        <InfoIcon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">{title}</h3>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
