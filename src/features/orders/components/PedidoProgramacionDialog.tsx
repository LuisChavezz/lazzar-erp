"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { CalendarDaysIcon, DeleteIcon, PlusIcon } from "@/src/components/Icons";
import { SectionTitle } from "@/src/components/DetailDialogPrimitives";
import { plural } from "@/src/utils/plural";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatQuoteDateTime } from "@/src/features/quotes/utils/quoteDetailsFormatters";
import {
  getPedidoProgramacionDestinoLabel,
  isPedidoProgramacionDestino,
  PEDIDO_PROGRAMACION_DESTINO_LABELS,
  type PedidoProgramacionDestino,
} from "../constants/pedidoProgramacion";
import { usePedidoProgramarContexto } from "../hooks/usePedidoProgramarContexto";
import { usePedidoProgramacionForm } from "../hooks/usePedidoProgramacionForm";
import {
  isMesaControlPermisoError,
  PEDIDO_PROGRAMAR_PERMISO_MESSAGE,
} from "../utils/pedidoProgramarErrors";
import { PedidoProgramarPartidas } from "./PedidoProgramarPartidas";
import {
  countCodePoints,
  PEDIDO_PROGRAMACION_COMENTARIOS_MAX,
} from "../schemas/pedido-programacion.schema";
import type { PedidoListItem } from "../interfaces/order.interface";
import type { PedidoProgramarContexto } from "../interfaces/pedido-programacion.interface";

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
  contexto: PedidoProgramarContexto;
  onClose: () => void;
}

function PedidoProgramacionForm({ contexto, onClose }: PedidoProgramacionFormProps) {
  const {
    form,
    rowKeys,
    totalPiezas,
    sumaProgramada,
    totalParcialidades,
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
  } = usePedidoProgramacionForm({ contexto, onSuccess: onClose });

  const listError = getError("programaciones");
  // `total_piezas` del backend excluye las líneas de muestra; la tabla sí las
  // lista, así que se avisa cuántas piezas quedan fuera de la programación.
  const piezasMuestra = contexto.renglones
    .filter((renglon) => renglon.es_muestra)
    .reduce((sum, renglon) => sum + renglon.cantidad, 0);
  const faltan = Math.max(0, totalPiezas - sumaProgramada);
  const pct = totalPiezas > 0 ? Math.min(100, Math.round((sumaProgramada / totalPiezas) * 100)) : 0;
  const completo = totalPiezas > 0 && sumaProgramada === totalPiezas;
  // Color del avance: rojo si se pasa, verde si cuadra exacto, azul en proceso.
  const tone = excedeTotal
    ? { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" }
    : completo
      ? { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }
      : { bar: "bg-sky-500", text: "text-slate-900 dark:text-white" };

  const addButton = (
    <button
      type="button"
      onClick={addRow}
      className="w-full inline-flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 dark:border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50/50 dark:hover:border-sky-600 dark:hover:text-sky-300 dark:hover:bg-sky-500/5 transition-colors cursor-pointer"
    >
      <PlusIcon className="w-4 h-4" aria-hidden="true" />
      Agregar destino
    </button>
  );

  return (
    <form onSubmit={handleFormSubmit} noValidate>
      {/* `min-w-0`: un fieldset mide por defecto lo que su contenido más ancho
          (`min-inline-size: min-content`), y una descripción larga lo sacaba
          del diálogo. */}
      <fieldset disabled={isPending} className="space-y-4 min-w-0">
        <PedidoProgramarPartidas
          renglones={contexto.renglones}
          almacenSurtido={contexto.almacen_surtido}
        />

        <div className="border-t border-slate-200 dark:border-white/10 pt-4">
          <SectionTitle>Parcialidades</SectionTitle>
        </div>

        {/* ── Resumen en vivo: piezas programadas contra el total ─────────── */}
        <div
          className={`rounded-2xl border px-4 py-3.5 ${
            excedeTotal
              ? "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10"
              : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
          }`}
          aria-live="polite"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              <span className={`text-2xl font-bold ${tone.text}`}>{sumaProgramada}</span>
              <span className="mx-1">de</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{totalPiezas}</span>{" "}
              {plural(totalPiezas, "pieza programada", "piezas programadas")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {totalParcialidades} {plural(totalParcialidades, "parcialidad", "parcialidades")}
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              {excedeTotal
                ? `Sobran ${sumaProgramada - totalPiezas}`
                : completo
                  ? "Completo"
                  : `Faltan ${faltan}`}
            </p>
          </div>
          <div className="mt-2.5 h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
              style={{ width: `${excedeTotal ? 100 : pct}%` }}
            />
          </div>
          {piezasMuestra > 0 && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {piezasMuestra} {plural(piezasMuestra, "pieza", "piezas")} de muestra no{" "}
              {plural(piezasMuestra, "cuenta", "cuentan")} para la programación.
            </p>
          )}
        </div>

        <form.Field name="programaciones" mode="array">
          {(arrayField) =>
            arrayField.state.value.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 px-4 py-6 text-center space-y-3">
                <CalendarDaysIcon className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sin destinos. Guardar dejará el pedido sin programar.
                </p>
                <div className="max-w-xs mx-auto">{addButton}</div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {arrayField.state.value.map((row, index) => (
                  <div
                    key={rowKeys[index] ?? index}
                    className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-3"
                  >
                    <div className="grid grid-cols-[1.75rem_1fr_7rem_auto] items-start gap-2.5">
                      {/* Número de parcialidad, alineado con los campos. */}
                      <span
                        className="mt-6 grid place-items-center w-7 h-7 rounded-full bg-sky-50 dark:bg-sky-500/10 text-xs font-bold text-sky-600 dark:text-sky-400"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>

                      <form.Field name={`programaciones[${index}].destino`}>
                        {(field) => (
                          <FormSelect
                            label="Destino"
                            className="py-2!"
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
                            label="Piezas"
                            className="py-2! text-right tabular-nums"
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
                        title="Quitar destino"
                        className="mt-5 p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <DeleteIcon className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Comentario en una línea, bajo destino + piezas; crece si
                        se escribe más. Sin `maxLength` nativo: el exceso se
                        marca con el error del schema en vez de truncarse. */}
                    <form.Field name={`programaciones[${index}].comentarios`}>
                      {(field) => {
                        // Code points, igual que el schema y el backend.
                        const comentariosLength = countCodePoints(field.state.value.trim());
                        return (
                          <div className="mt-2 ml-9.5">
                            <FormTextarea
                              aria-label={`Comentarios del destino ${index + 1}`}
                              placeholder="Comentarios para este destino (opcional)"
                              rows={1}
                              forceUppercase
                              name={field.name}
                              value={field.state.value}
                              onChange={(event) => {
                                field.handleChange(event.target.value);
                                clearError(`programaciones.${index}.comentarios`);
                              }}
                              error={getError(`programaciones.${index}.comentarios`)}
                            />
                            {comentariosLength > 0 && (
                              <p
                                className={`mt-1 text-right text-[11px] tabular-nums ${
                                  comentariosLength > PEDIDO_PROGRAMACION_COMENTARIOS_MAX
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-slate-400 dark:text-slate-500"
                                }`}
                              >
                                {comentariosLength}/{PEDIDO_PROGRAMACION_COMENTARIOS_MAX}
                              </p>
                            )}
                          </div>
                        );
                      }}
                    </form.Field>
                  </div>
                ))}
                {addButton}
              </div>
            )
          }
        </form.Field>

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

        <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Al guardar, esta lista reemplaza la programación vigente.
          </p>
          <div className="flex items-center justify-end gap-3">
            <FormCancelButton label="Cancelar" onClick={onClose} disabled={isPending} />
            {/* `disabled` lleva `isPending` DENTRO: pasarlo suelto pisaría la
                guarda interna de `FormSubmitButton`. */}
            <FormSubmitButton
              isPending={isPending}
              disabled={isPending || excedeTotal || hayDestinosNoAplicables}
              loadingLabel="Guardando..."
            >
              Guardar programación
            </FormSubmitButton>
          </div>
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
 * "Programar pedido" desde la Mesa de Control: UNA pantalla con las partidas del
 * pedido (sus tallas con servicios, stock disponible y faltante) y, debajo, sus parcialidades
 * de entrega por destino. Sustituye a los antiguos "Programar" y "Revisar
 * inventario".
 *
 * Todo sale de `GET /ventas/pedidos/{id}/programar/`
 * (`usePedidoProgramarContexto`), que se relee en cada apertura: el formulario
 * solo se monta con datos de ESTA apertura (`isFetchedAfterMount`) porque el
 * guardado reemplaza la lista entera.
 */
export function PedidoProgramacionDialog({ open, onOpenChange, order }: PedidoProgramacionDialogProps) {
  const { data, isInitialError, isNotFound, error, isFetchedAfterMount } =
    usePedidoProgramarContexto(order.id);
  const sinPermiso = isMesaControlPermisoError(error);

  const close = () => onOpenChange(false);

  return (
    <MainDialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="900px"
      showCloseButton={false}
      title={
        <span className="flex items-center gap-2">
          <CalendarDaysIcon className="w-4 h-4 text-sky-500" aria-hidden="true" />
          Programar pedido
        </span>
      }
      description={[
        order.folio ?? `Pedido #${order.id}`,
        order.cliente_razon_social ?? "—",
        // Mismo formateador que el detalle de pedido/cotización; "-" = sin fecha.
        formatQuoteDateTime(order.created_at, "d 'de' MMMM yyyy"),
      ]
        .filter((part) => part !== "-")
        .join(" · ")}
    >
      {isNotFound ? (
        // El endpoint acota por empresa: un pedido ajeno o dado de baja responde 404.
        <ErrorState
          title="Pedido no disponible"
          message="El pedido no existe o no pertenece a tu empresa."
        />
      ) : isInitialError ? (
        <ErrorState
          title={sinPermiso ? "Sin permiso" : "Error al cargar el pedido"}
          message={
            sinPermiso
              ? PEDIDO_PROGRAMAR_PERMISO_MESSAGE
              : extractErrorMessage(error, "No se pudo cargar la programación del pedido.")
          }
        />
      ) : !isFetchedAfterMount || !data ? (
        <Loader title="Cargando programación del pedido..." className="py-12" />
      ) : (
        <PedidoProgramacionForm contexto={data} onClose={close} />
      )}
    </MainDialog>
  );
}
