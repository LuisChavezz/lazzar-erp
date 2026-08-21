"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useSession } from "next-auth/react";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { Loader } from "@/src/components/Loader";
import { InfoIcon, RouteIcon, ViewIcon } from "@/src/components/Icons";
import type { FormFieldError } from "@/src/utils/getFieldError";
import {
  PICKING_PRIORIDADES,
  PICKING_TIPOS,
  PickingHeaderSchema,
  type PickingHeaderValues,
} from "../schemas/picking.schema";
import { PRODUCTO_TERMINADO_ALMACEN_ID } from "../constants/pickingAlmacen";
import { usePickingOnboarding } from "../hooks/usePickingOnboarding";
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

type HeaderField = keyof PickingHeaderValues;

interface PickingWizardStep1Props {
  initialValues: PickingHeaderValues;
  // Solo el encabezado: el Paso 2 resuelve su propio `pedido` (con el mismo
  // shape) desde `usePickingOnboarding(header.pedido)`, que de todas formas
  // necesita pedir para el pendiente por talla — pasar el pedido ya resuelto
  // aquí sería dato muerto, nunca consumido por el manager.
  onNext: (values: PickingHeaderValues) => void;
}

export function PickingWizardStep1({ initialValues, onNext }: PickingWizardStep1Props) {
  const { data, isLoading, isError } = usePickingOnboarding();
  const pedidos = data?.pedidos ?? [];
  const almacenesDestino = useMemo(() => data?.almacenes_destino ?? [], [data]);
  // Memoizado: sin esto, `data?.operadores ?? []` crea un arreglo nuevo en cada
  // render, lo que invalidaría la dependencia del `useEffect` de preselección de
  // abajo en cada render (aunque el `useRef` lo protege de re-ejecutarse, el
  // warning de `exhaustive-deps` es legítimo — esto lo resuelve de raíz).
  const operadores = useMemo(() => data?.operadores ?? [], [data]);

  const { data: session, status: sessionStatus } = useSession();

  const [errors, setErrors] = useState<Partial<Record<HeaderField, string>>>({});
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);

  const getError = (field: HeaderField): FormFieldError | undefined => {
    const message = errors[field];
    return message ? { message } : undefined;
  };
  const clearError = (field: HeaderField) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const form = useForm({
    defaultValues: initialValues,
    onSubmit: ({ value }) => {
      const parsed = PickingHeaderSchema.safeParse(value);
      if (!parsed.success) {
        const next: Partial<Record<HeaderField, string>> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path[0] as HeaderField;
          if (key && !next[key]) next[key] = issue.message;
        });
        setErrors(next);
        return;
      }
      const pedido = pedidos.find((p) => p.id === parsed.data.pedido);
      if (!pedido) {
        setErrors((prev) => ({ ...prev, pedido: "El pedido es requerido" }));
        return;
      }
      setErrors({});
      onNext(parsed.data);
    },
  });

  // Suscripción reactiva al pedido/operador elegidos (los hooks van SIEMPRE
  // antes de cualquier retorno temprano — Rules of Hooks).
  const selectedPedidoId = useStore(form.store, (state) => state.values.pedido);
  const selectedOperadorId = useStore(form.store, (state) => state.values.operador);
  const selectedDestinoId = useStore(form.store, (state) => state.values.almacen_destino);
  const selectedPedido = pedidos.find((p) => p.id === selectedPedidoId) ?? null;

  /**
   * Destinos que el backend de verdad aceptaría para ESTE pedido. `almacenes_destino`
   * ya viene filtrado por `permite_entrada`, pero el `POST` valida dos cosas más
   * que ese subconjunto no garantiza, y ofrecer opciones que fallan seguro solo
   * cambia un error evitable por un 400:
   *
   *  - el destino debe ser de la SUCURSAL DEL PEDIDO (la lista viene acotada a
   *    las sucursales del USUARIO, que pueden ser varias), y
   *  - debe ser DISTINTO del origen (que aquí es fijo).
   *
   * El almacén SIN sucursal (`sucursal: null`, posible porque el campo es
   * nullable en el catálogo) pasa el filtro a propósito: el backend lo acepta
   * para cualquier pedido —solo compara cuando hay sucursal
   * (`if almacen_destino.sucursal_id and ... != pedido.sucursal_id`)—, así que
   * descartarlo escondería un destino válido. Llega sobre todo a usuarios
   * superusuario o admin de empresa, para los que el backend no acota el
   * catálogo por sucursal.
   *
   * Mientras no haya pedido elegido no se puede aplicar el filtro de sucursal,
   * así que se muestran todos los destinos menos el origen; al elegir pedido la
   * lista se acota y el efecto de abajo descarta una selección que ya no aplique.
   */
  const destinoOptions = useMemo(() => {
    const sinOrigen = almacenesDestino.filter(
      (a) => a.id !== PRODUCTO_TERMINADO_ALMACEN_ID,
    );
    if (!selectedPedido) return sinOrigen;
    return sinOrigen.filter(
      (a) => a.sucursal === null || a.sucursal === selectedPedido.sucursal,
    );
  }, [almacenesDestino, selectedPedido]);

  /**
   * Mantiene `almacen_destino` coherente con las opciones vigentes:
   *
   *  - si solo hay una opción, se preselecciona (no hay elección que hacer), y
   *  - si la opción elegida desaparece —típicamente al cambiar de pedido a otro
   *    de distinta sucursal—, se limpia en lugar de dejar en el estado un id
   *    que el select ya no muestra y que el backend rechazaría.
   *
   * A diferencia de la preselección del operador, esto NO es un default de una
   * sola vez: es una invariante que debe re-evaluarse cada vez que cambian las
   * opciones.
   *
   * El early-return con la lista CRUDA vacía distingue "la opción elegida dejó
   * de aplicar" de "todavía no hay catálogo contra el que comparar". Sin él, al
   * regresar del Paso 2 con la caché del onboarding ya recolectada (el gcTime
   * corre desde que el Paso 1 se desmonta) el efecto vería `destinoOptions`
   * vacío y borraría una selección perfectamente válida — y este hook corre
   * ANTES del early-return de `isLoading`, así que el Loader no lo evita.
   */
  useEffect(() => {
    if (almacenesDestino.length === 0) return;
    const current = form.getFieldValue("almacen_destino");
    if (current > 0 && !destinoOptions.some((a) => a.id === current)) {
      form.setFieldValue("almacen_destino", 0);
      return;
    }
    if (current === 0 && destinoOptions.length === 1) {
      form.setFieldValue("almacen_destino", destinoOptions[0].id);
    }
  }, [almacenesDestino, destinoOptions, form]);

  // Preselección del operador: si el usuario autenticado aparece en la lista de
  // `operadores` del onboarding, se le preselecciona por conveniencia — sigue
  // siendo un select normal y editable. Se aplica UNA SOLA VEZ (por apertura del
  // asistente): ni pisa una elección ya hecha por el usuario, ni una preservada
  // al "Regresar" desde el Paso 2 (el encabezado vive en `PickingStepManager` y
  // llega aquí vía `initialValues`, así que si `operador` ya trae un valor >0 se
  // respeta tal cual). Si el usuario de sesión NO aparece en la lista, se deja
  // sin seleccionar — nunca es un error, solo un required-field normal.
  const appliedOperadorDefault = useRef(false);
  useEffect(() => {
    if (appliedOperadorDefault.current) return;
    if (operadores.length === 0) return;
    if (sessionStatus === "loading") return;
    appliedOperadorDefault.current = true;

    if (form.getFieldValue("operador")) return;

    const raw = session?.user?.id;
    const parsed = raw ? Number(raw) : NaN;
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    const match = operadores.find((o) => o.id === parsed);
    if (match) form.setFieldValue("operador", match.id);
  }, [operadores, session?.user?.id, sessionStatus, form]);

  if (isLoading) {
    return (
      <Loader
        className="py-12"
        title="Cargando datos"
        message="Cargando pedidos y operadores..."
      />
    );
  }

  if (isError) {
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

  const missingItems: string[] = [];
  if (pedidos.length === 0) missingItems.push("Al menos un pedido autorizado o en proceso");
  if (operadores.length === 0) missingItems.push("Al menos un operador disponible");
  // Se evalúa contra la lista CRUDA, no contra `destinoOptions`: sin almacenes
  // de entrada falta configuración del catálogo (esta pantalla), mientras que
  // "hay almacenes pero ninguno sirve para este pedido" es un caso del selector
  // —depende del pedido elegido— y se resuelve ahí, no bloqueando el asistente.
  if (almacenesDestino.length === 0) {
    missingItems.push("Al menos un almacén que permita entradas (destino del surtido)");
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

  const canAdvance =
    selectedPedidoId > 0 && selectedOperadorId > 0 && selectedDestinoId > 0;

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        className="w-full space-y-6"
      >
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <RouteIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Detalles del picking</h3>
              <p className="text-[11px] text-slate-500">
                Pedido a surtir, operador asignado y almacén destino
              </p>
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
                        const nextId = Number.isNaN(next) ? 0 : next;
                        field.handleChange(nextId);
                        clearError("pedido");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("pedido")}
                    >
                      <option value="0" disabled>
                        Seleccionar pedido...
                      </option>
                      {pedidos.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {p.folio}
                          {p.cliente_nombre ? ` — ${p.cliente_nombre}` : ""}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
                {selectedPedido && (
                  <button
                    type="button"
                    onClick={() => setIsOrderDetailOpen(true)}
                    className="mt-1.5 ml-1 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer transition-colors"
                  >
                    <ViewIcon className="w-3.5 h-3.5" />
                    Ver detalle del pedido
                  </button>
                )}
              </div>

              <form.Field name="operador">
                {(field) => (
                  <FormSelect
                    label="Operador"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      field.handleChange(Number.isNaN(next) ? 0 : next);
                      clearError("operador");
                    }}
                    onBlur={field.handleBlur}
                    error={getError("operador")}
                  >
                    <option value="0" disabled>
                      Seleccionar operador...
                    </option>
                    {operadores.map((o) => (
                      <option
                        key={o.id}
                        value={o.id}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {o.nombre}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <form.Field name="almacen_destino">
                  {(field) => (
                    <FormSelect
                      label="Almacén destino"
                      name={field.name}
                      value={field.state.value}
                      disabled={destinoOptions.length === 0}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        field.handleChange(Number.isNaN(next) ? 0 : next);
                        clearError("almacen_destino");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("almacen_destino")}
                    >
                      <option value="0" disabled>
                        Seleccionar almacén destino...
                      </option>
                      {destinoOptions.map((a) => (
                        <option
                          key={a.id}
                          value={a.id}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {a.nombre}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
                {/* Cuelga de la MISMA condición que el `disabled` de arriba: si
                    solo se mostrara con pedido elegido, el caso "todos los
                    almacenes de entrada son el propio origen" dejaría el campo
                    en gris sin decir por qué, y sin forma de avanzar. */}
                {destinoOptions.length === 0 && (
                  <p className="mt-1.5 ml-1 text-xs text-amber-600 dark:text-amber-400">
                    {selectedPedido
                      ? "No hay almacenes de entrada en la sucursal de este pedido."
                      : "No hay almacenes de entrada distintos del almacén de origen."}
                  </p>
                )}
              </div>

              <form.Field name="prioridad">
                {(field) => (
                  <FormSelect
                    label="Prioridad"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value as (typeof PICKING_PRIORIDADES)[number]);
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

        <div className="flex items-center justify-end gap-3 pt-1">
          <FormSubmitButton isPending={false} disabled={!canAdvance}>
            Continuar a surtir tallas
          </FormSubmitButton>
        </div>
      </form>

      {isOrderDetailOpen && selectedPedido && (
        <PickingOrderDetailDialog
          order={selectedPedido}
          open={true}
          onOpenChange={setIsOrderDetailOpen}
        />
      )}
    </>
  );
}
