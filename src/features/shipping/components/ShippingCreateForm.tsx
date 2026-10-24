"use client";

import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { Loader } from "@/src/components/Loader";
import {
  ExclamationTriangleIcon,
  InfoIcon,
  RefreshIcon,
} from "@/src/components/Icons";
import { shippingOnboardingErrorMessage } from "../hooks/useShippingOnboarding";
import { useShippingForm } from "../hooks/useShippingForm";
import { ShippingLinesTable } from "./ShippingLinesTable";
import { ShippingPackingSelector } from "./ShippingPackingSelector";
import { SHIPMENT_GUIA_MAX_LENGTH } from "../schemas/shipping.schema";

interface ShippingCreateFormProps {
  /** Se invoca tras registrar el despacho correctamente (cierra el diálogo). */
  onSuccess: () => void;
}

/**
 * Captura de despacho en UN SOLO PASO.
 *
 * Decisión de arquitectura (deliberadamente distinta de picking/packing, que
 * sí usan `StepProgressBar` + `...StepManager`): el contrato de
 * `POST /wms/despachos/` recibe `{ packing, despacho_detalle, guia }`, y
 * `despacho_detalle` no lleva cantidad ni ningún otro dato por línea. Del
 * encabezado solo se captura la guía (opcional) —ni cajas, ni peso, ni fechas,
 * ni observaciones—, así que un "Paso 1" cuyo único contenido sería el selector de packing no
 * agregaría ninguna decisión: solo una pantalla y un botón "Continuar" de más.
 * Con un solo paso, además, cambiar de packing es un clic en la lista (que
 * queda visible) en vez de un "Regresar". Mismo criterio —y mismo precedente—
 * que `CreateInvoiceDialog`, que documenta esta misma elección para un
 * endpoint igual de pequeño.
 *
 * NO existe selector de envío, a propósito: `Despacho.envio` es nullable en el
 * backend y un `Envio` se puede crear por API (`POST /logistica/envios/`),
 * pero exige un `transportista` y `Transportista` no tiene nombre ni endpoint
 * de catálogo, así que el selector no tendría nada que mostrar. Y
 * tampoco hay un flujo de "asociar envío después": `Despacho` no expone
 * `PATCH`/`PUT`, no hay endpoint detrás de ese botón. Lo que sí se hace es
 * DECIRLO (aviso junto al botón de registro) y, como la guía tampoco se puede
 * agregar después, pedir confirmación cuando el envío va sin ella.
 */
export function ShippingCreateForm({ onSuccess }: ShippingCreateFormProps) {
  const {
    selectedPackingId,
    selectPacking,
    packing,
    rows,
    availableRowsCount,
    alreadyShippedCount,
    embarque,
    allLinesRequired,
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
    guia,
    setGuia,
    confirmWithoutGuiaOpen,
    setConfirmWithoutGuiaOpen,
    confirmWithoutGuia,
    isPending,
    handleSubmit,
  } = useShippingForm({ onSuccess });

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
            Embarque a enviar
          </h3>
          <p className="text-[11px] text-slate-500">
            El pedido, el cliente y la sucursal se heredan del embarque elegido.
          </p>
        </div>
        <ShippingPackingSelector
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
                Embarque
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
              message="Consultando qué líneas de este embarque se pueden enviar..."
            />
          ) : isError ? (
            <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 space-y-3 text-center">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                No se pudieron cargar las líneas del embarque
              </p>
              <p className="text-xs text-red-500 dark:text-red-300">
                {shippingOnboardingErrorMessage(error)}
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
              title="Este embarque no tiene líneas registradas"
              subtitle="Elige otro embarque de la lista de arriba."
            />
          ) : embarque !== null && !embarque.despachable ? (
            // Va ANTES de "ya enviado": cuando el pedido no es despachable el
            // backend manda todas las líneas como no disponibles, y sin esta
            // rama se leería como un embarque que ya salió.
            <InfoPanel
              title="Este embarque todavía no se puede enviar"
              subtitle={
                embarque.motivo ??
                "El pedido no permite embarque parcial y aún tiene piezas por empacar."
              }
            />
          ) : availableRowsCount === 0 ? (
            <InfoPanel
              title="Este embarque ya fue enviado por completo"
              subtitle={`${
                alreadyShippedCount === 1
                  ? "Su 1 línea ya salió"
                  : `Sus ${alreadyShippedCount} líneas ya salieron`
              } en un envío anterior. Elige otro embarque de la lista de arriba.`}
            />
          ) : (
            <fieldset disabled={isPending} className="space-y-5">
              <ShippingLinesTable
                rows={rows}
                checkedIds={checkedIds}
                availableRowsCount={availableRowsCount}
                selectedCount={selectedCount}
                onToggleLine={toggleLine}
                onToggleAll={toggleAll}
                locked={allLinesRequired}
              />
            </fieldset>
          )}

          {isFetching && !isLoading && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-right">
              Actualizando la disponibilidad de las líneas...
            </p>
          )}

          {/* ── Guía + aviso del transportista ────────────────────────────
              Solo cuando la acción es alcanzable (hay líneas disponibles).
              La guía no se puede agregar después (`Despacho` no tiene
              `PATCH`): si va vacía, el registro pide confirmación aparte. */}
          {availableRowsCount > 0 && (
            <>
              <FormInput
                label="Guía (opcional)"
                name="guia"
                placeholder="Número de guía del envío"
                maxLength={SHIPMENT_GUIA_MAX_LENGTH}
                forceUppercase
                value={guia}
                disabled={isPending}
                onChange={(event) => setGuia(event.target.value)}
                // Enter aquí no registra: el envío es irreversible y no debe
                // salir con una tecla al terminar de escribir la guía (mismo
                // motivo por el que el selector vive fuera del formulario). El
                // Enter que confirma una composición (IME) sí se deja pasar.
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                  }
                }}
              />

              {/* Tono informativo (ámbar), no de error: es una limitación del
                  registro que conviene conocer antes de confirmarlo. */}
              <div
                role="note"
                className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
              >
                <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <p className="min-w-0 flex-1 text-xs text-amber-700 dark:text-amber-300">
                  Por ahora no se puede capturar el transportista, y no podrá agregarse a este envío
                  después.
                </p>
              </div>
            </>
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
              Registrar envío
            </FormSubmitButton>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmWithoutGuiaOpen}
        onOpenChange={setConfirmWithoutGuiaOpen}
        title="¿Registrar el envío sin guía?"
        description="Se registrará sin guía ni transportista y no podrás agregarlos después."
        confirmText={isPending ? "Registrando..." : "Registrar sin guía"}
        confirmColor="amber"
        closeOnConfirm={false}
        busy={isPending}
        onConfirm={() => void confirmWithoutGuia()}
      />
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
