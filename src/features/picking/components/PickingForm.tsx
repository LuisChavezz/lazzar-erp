"use client";

import { useState } from "react";
import { useStore } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Loader } from "@/src/components/Loader";
import { Button } from "@/src/components/Button";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import {
  RouteIcon,
  InfoIcon,
  ExclamationTriangleIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { PICKING_PRIORIDADES, PICKING_TIPOS } from "../schemas/picking.schema";
import { usePickingForm } from "../hooks/usePickingForm";
import { PickingOrderDetailDialog } from "./PickingOrderDetailDialog";

const PRIORIDAD_LABELS: Record<(typeof PICKING_PRIORIDADES)[number], string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
};

const TIPO_LABELS: Record<(typeof PICKING_TIPOS)[number], string> = {
  ORDER_PICKING: "Por pedido",
  BATCH_PICKING: "Por lote",
  WAVE_PICKING: "Por oleada",
  ZONE_PICKING: "Por zona",
};

/**
 * Cuerpo del formulario — se monta solo cuando el diálogo está abierto, por lo
 * que los catálogos (pedidos, almacenes) se cargan bajo demanda.
 */
function PickingFormContent({ onClose }: { onClose: () => void }) {
  const {
    form,
    isPending,
    isLoadingFormData,
    isErrorFormData,
    missingItems,
    orders,
    orderOptions,
    warehouseOptions,
    serverBanner,
    dismissBanner,
    getError,
    clearError,
    handleFormSubmit,
    handleReset,
  } = usePickingForm({ onSuccess: onClose });

  // ── "Ver detalle" del pedido seleccionado (diálogo apilado) ───────────────
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  // Suscripción reactiva al pedido elegido (mismo patrón que StockTransferForm).
  const selectedPedidoId = useStore(form.store, (state) => state.values.pedido);
  const selectedOrder = orders.find((order) => order.id === selectedPedidoId) ?? null;

  if (isLoadingFormData) {
    return (
      <Loader
        className="py-12"
        title="Cargando datos"
        message="Cargando pedidos y almacenes..."
      />
    );
  }

  // Si algún catálogo (pedidos/almacenes) falló, NO se renderiza el formulario
  // con selects vacíos —que se confundirían con catálogos legítimamente
  // vacíos—: se muestra un error explícito. Mismo patrón que `StockTransferForm`.
  if (isErrorFormData) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          No se pudieron cargar los catálogos
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          Revisa tu conexión e intenta abrir el diálogo de nuevo.
        </p>
      </div>
    );
  }

  if (missingItems.length > 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <InfoIcon className="w-6 h-6" />
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Faltan configuraciones para registrar un picking
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Antes de iniciar un surtido, verifica lo siguiente:
              </p>
            </div>
            <ul className="list-disc pl-5 text-sm text-amber-700 dark:text-amber-300 space-y-1">
              {missingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleFormSubmit} className="w-full space-y-6">
        {/* ── Banner de error del backend ───────────────────────────────── */}
        {serverBanner && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/20 px-4 py-3"
          >
            <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                {serverBanner}
              </p>
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

        <fieldset disabled={isPending} className="space-y-6">
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                <RouteIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  Detalles del picking
                </h3>
                <p className="text-[11px] text-slate-500">Pedido a surtir y almacén de origen</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <form.Field name="pedido">
                    {(field) => (
                      <FormSelect
                        label="Pedido"
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          field.handleChange(Number.isNaN(next) ? 0 : next);
                          clearError("pedido");
                        }}
                        onBlur={field.handleBlur}
                        error={getError("pedido")}
                      >
                        <option value="0" disabled>
                          Seleccionar pedido...
                        </option>
                        {orderOptions.map((opt) => (
                          <option
                            key={opt.value}
                            value={opt.value}
                            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                          >
                            {opt.label}
                          </option>
                        ))}
                      </FormSelect>
                    )}
                  </form.Field>
                  {/* Visible solo con un pedido elegido: abre el diálogo
                      apilado de detalle SIN cerrar este formulario. Las clases
                      `disabled:*` no necesitan un prop `disabled` propio: este
                      botón es descendiente del `<fieldset disabled={isPending}>`
                      de más abajo, que deshabilita nativamente todo control de
                      formulario anidado (incluye `<button>`) mientras el
                      picking se está registrando — por eso `:disabled` sí
                      aplica en ese momento pese a no fijarse aquí. */}
                  {selectedOrder && (
                    <button
                      type="button"
                      onClick={() => setIsOrderDetailOpen(true)}
                      className="mt-1.5 ml-1 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ViewIcon className="w-3.5 h-3.5" />
                      Ver detalle del pedido
                    </button>
                  )}
                </div>

                <form.Field name="almacen">
                  {(field) => (
                    <FormSelect
                      label="Almacén Origen"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        field.handleChange(Number.isNaN(next) ? 0 : next);
                        clearError("almacen");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("almacen")}
                    >
                      <option value="0" disabled>
                        Seleccionar almacén...
                      </option>
                      {warehouseOptions.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <form.Field name="prioridad">
                  {(field) => (
                    <FormSelect
                      label="Prioridad"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(
                          event.target.value as (typeof PICKING_PRIORIDADES)[number],
                        );
                        clearError("prioridad");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("prioridad")}
                    >
                      {PICKING_PRIORIDADES.map((value) => (
                        <option
                          key={value}
                          value={value}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {PRIORIDAD_LABELS[value]}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>

                <form.Field name="tipo">
                  {(field) => (
                    <FormSelect
                      label="Tipo de picking"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value as (typeof PICKING_TIPOS)[number]);
                        clearError("tipo");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("tipo")}
                    >
                      {PICKING_TIPOS.map((value) => (
                        <option
                          key={value}
                          value={value}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {TIPO_LABELS[value]}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              </div>

              <form.Field name="observaciones">
                {(field) => (
                  <FormTextarea
                    label="Observaciones (opcional)"
                    placeholder="Notas del picking"
                    rows={2}
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearError("observaciones");
                    }}
                    onBlur={field.handleBlur}
                    error={getError("observaciones")}
                  />
                )}
              </form.Field>
            </div>
          </section>
        </fieldset>

        <div className="flex items-center justify-end gap-3 pt-2">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Registrando...">
            Registrar picking
          </FormSubmitButton>
        </div>
      </form>

      {/* Diálogo de detalle del pedido APILADO ENCIMA del formulario, que
          permanece montado detrás para no perder el estado capturado — mismo
          patrón que el selector de producto de `StockTransferForm`. Montaje
          condicional: su petición (`usePedidoDetail`) no existe hasta que el
          usuario pulsa "Ver detalle del pedido". */}
      {isOrderDetailOpen && selectedOrder && (
        <PickingOrderDetailDialog
          order={selectedOrder}
          open={true}
          onOpenChange={setIsOrderDetailOpen}
        />
      )}
    </>
  );
}

/**
 * Punto de entrada: botón que abre el diálogo de captura de picking. El
 * contenido (y con él los catálogos) solo se monta cuando el modal se abre.
 */
export const PickingForm = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <MainDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      title={
        <DialogHeader
          title="Nuevo Picking"
          subtitle="Inicia el surtido de un pedido"
          statusColor="sky"
        />
      }
      maxWidth="700px"
      showCloseButton={false}
      trigger={
        <Button variant="primary">
          <RouteIcon className="w-4 h-4" />
          Nuevo picking
        </Button>
      }
    >
      {isDialogOpen && <PickingFormContent onClose={() => setIsDialogOpen(false)} />}
    </MainDialog>
  );
};
