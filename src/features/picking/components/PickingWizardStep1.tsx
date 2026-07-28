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
  const selectedPedido = pedidos.find((p) => p.id === selectedPedidoId) ?? null;

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

  const canAdvance = selectedPedidoId > 0 && selectedOperadorId > 0;

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
              <p className="text-[11px] text-slate-500">Pedido a surtir y operador asignado</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
