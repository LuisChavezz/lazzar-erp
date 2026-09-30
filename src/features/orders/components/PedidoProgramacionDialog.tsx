"use client";

import { AxiosError } from "axios";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Button } from "@/src/components/Button";
import { CalendarDaysIcon, DeleteIcon, PlusIcon } from "@/src/components/Icons";
import {
  getPedidoProgramacionDestinoLabel,
  isPedidoProgramacionDestino,
  PEDIDO_PROGRAMACION_DESTINO_LABELS,
  type PedidoProgramacionDestino,
} from "../constants/pedidoProgramacion";
import { usePedidoDetail } from "../hooks/usePedidoDetail";
import { usePedidoProgramacionForm } from "../hooks/usePedidoProgramacionForm";
import {
  countCodePoints,
  PEDIDO_PROGRAMACION_COMENTARIOS_MAX,
} from "../schemas/pedido-programacion.schema";
import type { PedidoDetail, PedidoListItem } from "../interfaces/order.interface";

/**
 * Opciones del select de UN renglón: solo los `destinos_aplicables` del pedido.
 *
 * Un destino GUARDADO fuera de esa lista no tendría opción, y un `<select>`
 * nativo pintaría la primera ("Seleccionar...") aunque el estado conserve el
 * código. Se añade como opción visible SOLO en su propio renglón —nunca se
 * ofrece a los demás— para que el usuario vea qué hay guardado: marcado
 * "no aplica" si es de la lista blanca (el renglón muestra su error) o
 * "Desconocido" si no lo es (lo marca el schema).
 */
const getDestinoOptions = (
  destino: string,
  destinosAplicables: readonly PedidoProgramacionDestino[],
) => {
  const options = [
    { value: "", label: "Seleccionar..." },
    ...destinosAplicables.map((codigo) => ({
      value: codigo,
      label: PEDIDO_PROGRAMACION_DESTINO_LABELS[codigo],
    })),
  ];
  if (destino === "" || (destinosAplicables as readonly string[]).includes(destino)) {
    return options;
  }
  const label = isPedidoProgramacionDestino(destino)
    ? `${PEDIDO_PROGRAMACION_DESTINO_LABELS[destino]} (no aplica)`
    : getPedidoProgramacionDestinoLabel(destino);
  return [...options, { value: destino, label }];
};

/** Solo dígitos: `cantidad` es un entero positivo. */
const sanitizeIntegerInput = (raw: string) => raw.replace(/\D/g, "");

interface PedidoProgramacionFormProps {
  pedido: PedidoDetail;
  onClose: () => void;
}

function PedidoProgramacionForm({ pedido, onClose }: PedidoProgramacionFormProps) {
  const {
    form,
    rowKeys,
    totalPiezas,
    sumaProgramada,
    excedeTotal,
    destinosAplicables,
    hayDestinosNoAplicables,
    isPending,
    getError,
    getDestinoError,
    clearError,
    addRow,
    removeRow,
    handleFormSubmit,
  } = usePedidoProgramacionForm({ pedido, onSuccess: onClose });

  const listError = getError("programaciones");

  return (
    <form onSubmit={handleFormSubmit} noValidate>
      <fieldset disabled={isPending} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Al guardar, esta lista reemplaza por completo la programación vigente.
          </p>
          <Button type="button" variant="secondary" rounded="full" onClick={addRow}>
            <span className="inline-flex items-center gap-1.5">
              <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
              Agregar destino
            </span>
          </Button>
        </div>

        <form.Field name="programaciones" mode="array">
          {(arrayField) =>
            arrayField.state.value.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center py-6">
                Sin programaciones. Guardar dejará el pedido sin programar.
              </p>
            ) : (
              <div className="space-y-3">
                {arrayField.state.value.map((row, index) => (
                  <div
                    key={rowKeys[index] ?? index}
                    className="grid grid-cols-[1fr_8rem_auto] items-start gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-3"
                  >
                    <form.Field name={`programaciones[${index}].destino`}>
                      {(field) => (
                        <FormSelect
                          label="Destino"
                          options={getDestinoOptions(row.destino, destinosAplicables)}
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            clearError(`programaciones.${index}.destino`);
                          }}
                          error={getDestinoError(index)}
                        />
                      )}
                    </form.Field>

                    <form.Field name={`programaciones[${index}].cantidad`}>
                      {(field) => (
                        <FormInput
                          label="Cantidad"
                          inputMode="numeric"
                          placeholder="0"
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(sanitizeIntegerInput(event.target.value));
                            clearError(`programaciones.${index}.cantidad`);
                          }}
                          error={getError(`programaciones.${index}.cantidad`)}
                        />
                      )}
                    </form.Field>

                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      aria-label={`Quitar destino ${index + 1}`}
                      className="mt-6 p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <DeleteIcon className="w-4 h-4" aria-hidden="true" />
                    </button>

                    {/* Segunda fila del renglón, bajo destino + cantidad: un
                        comentario largo crece hacia abajo sin empujar los
                        controles. Sin `maxLength` nativo: el exceso se marca
                        con el error del schema en vez de truncarse en silencio. */}
                    <form.Field name={`programaciones[${index}].comentarios`}>
                      {(field) => {
                        // Code points, igual que el schema y el backend.
                        const comentariosLength = countCodePoints(field.state.value.trim());
                        return (
                          <div className="col-span-2">
                            <FormTextarea
                              label="Comentarios (opcional)"
                              placeholder="Indicaciones para este destino..."
                              rows={2}
                              forceUppercase
                              name={field.name}
                              value={field.state.value}
                              onChange={(event) => {
                                field.handleChange(event.target.value);
                                clearError(`programaciones.${index}.comentarios`);
                              }}
                              error={getError(`programaciones.${index}.comentarios`)}
                            />
                            <p
                              className={`mt-1 text-right text-[11px] tabular-nums ${
                                comentariosLength > PEDIDO_PROGRAMACION_COMENTARIOS_MAX
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {comentariosLength}/{PEDIDO_PROGRAMACION_COMENTARIOS_MAX}
                            </p>
                          </div>
                        );
                      }}
                    </form.Field>
                  </div>
                ))}
              </div>
            )
          }
        </form.Field>

        {/* Suma en vivo contra el total del pedido. */}
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
            excedeTotal
              ? "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10"
              : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
          }`}
          aria-live="polite"
        >
          <span className="text-xs text-slate-500 dark:text-slate-400">Programado</span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              excedeTotal ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-200"
            }`}
          >
            {sumaProgramada} de {totalPiezas} piezas
          </span>
        </div>

        {excedeTotal && !listError && (
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            La suma programada excede el total de piezas del pedido. Ajusta las cantidades
            para poder guardar.
          </p>
        )}
        {listError && (
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            {listError.message}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <FormCancelButton label="Cancelar" onClick={onClose} disabled={isPending} />
          {/* `disabled` lleva `isPending` DENTRO: pasarlo suelto pisaría la guarda
              interna de `FormSubmitButton`. */}
          <FormSubmitButton
            isPending={isPending}
            disabled={isPending || excedeTotal || hayDestinosNoAplicables}
            loadingLabel="Guardando..."
          >
            Guardar programación
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}

interface PedidoProgramacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Renglón del listado: basta para el título mientras carga el detalle. */
  order: PedidoListItem;
}

/**
 * "Programar pedido" desde la Mesa de Control.
 *
 * El renglón del listado (`PedidoListItem`) no trae `detalles` ni
 * `programacion_conf`, así que el diálogo lee el detalle al abrirse
 * (`usePedidoDetail`), con los estados de carga/error de
 * `PickingOrderDetailDialog`.
 *
 * `refetchOnMount: "always"` + esperar a `isFetchedAfterMount`: el guardado
 * REEMPLAZA la lista entera, así que el formulario solo se monta con datos
 * leídos en esta apertura, nunca con la caché (compartida con el detalle 360°)
 * de hace minutos.
 */
export function PedidoProgramacionDialog({ open, onOpenChange, order }: PedidoProgramacionDialogProps) {
  const { data, isError, error, isFetchedAfterMount } = usePedidoDetail(order.id, {
    refetchOnMount: "always",
  });

  const close = () => onOpenChange(false);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="640px"
      showCloseButton={false}
      title={
        <span className="flex items-center gap-2">
          <CalendarDaysIcon className="w-4 h-4 text-sky-500" aria-hidden="true" />
          Programar pedido
        </span>
      }
      description={`${order.folio ?? `Pedido #${order.id}`} · ${order.cliente_razon_social ?? "—"}`}
    >
      {isError ? (
        <ErrorState
          title="Error al cargar el pedido"
          message={
            // `get_object` acota por empresa: un pedido ajeno responde 404.
            error instanceof AxiosError && error.response?.status === 404
              ? "El pedido no existe o no pertenece a tu empresa."
              : (error as Error)?.message
          }
        />
      ) : !isFetchedAfterMount || !data ? (
        <Loader title="Cargando programación del pedido..." className="py-12" />
      ) : (
        <PedidoProgramacionForm pedido={data} onClose={close} />
      )}
    </MainDialog>
  );
}
