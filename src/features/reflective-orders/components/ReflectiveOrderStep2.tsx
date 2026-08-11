"use client";

import { FormSecondaryButton, FormSubmitButton } from "@/src/components/FormButtons";
import { Loader } from "@/src/components/Loader";
import { ExclamationTriangleIcon, InfoIcon } from "@/src/components/Icons";
import { useReflectiveStep2Form } from "../hooks/useReflectiveStep2Form";
import type { CreateReflectiveOrderFormValues } from "../schemas/reflective-order.schema";
import { ReflectiveOrderLinesTable } from "./ReflectiveOrderLinesTable";

interface ReflectiveOrderStep2Props {
  header: CreateReflectiveOrderFormValues;
  onBack: () => void;
  onSuccess: () => void;
  /**
   * Abre el diálogo de detalle (`ReflectiveOrderDetailDialog`, montado en
   * `ReflectiveOrdersView`) para el `id` dado. Lo usa el bloque de duplicado
   * (409) para llevar a la orden YA EXISTENTE — no navega a ninguna ruta, es la
   * misma mecánica de estado (`openOrderId`) que abre el detalle desde el
   * listado.
   */
  onViewExistingOrder: (id: number) => void;
}

/**
 * Paso 2 del alta de orden de reflejante: qué prendas del pedido entran en esta
 * orden y con cuántas piezas. Es el ÚNICO punto de envío del flujo.
 *
 * Siempre se manda `detalles_override`, incluso cuando el usuario no cambia
 * nada: omitirlo enruta el POST por la vía del pedido completo, donde un pedido
 * ya cubierto responde 409 ("ya existe una orden…") en vez del error de cupo,
 * que es el que de verdad explica qué pasa. Ver `buildReflectiveOrderPayload`.
 *
 * SIN detalle visual por línea (ni popover de ubicación como en bordado): no
 * porque el config esté vacío —`reflejante_config` es un arreglo de hasta tres
 * reflejantes, con dos materiales en P-00027— sino porque ese arreglo es
 * uniforme entre las líneas del pedido, así que nada distingue a una línea de
 * otra más allá de producto/talla/color y cantidades, que es lo que muestra la
 * tabla. Enseñar el config (una vez, no por línea) queda pendiente. Ver
 * `ReflectiveOrderLinesTable`.
 */
export function ReflectiveOrderStep2({
  header,
  onBack,
  onSuccess,
  onViewExistingOrder,
}: ReflectiveOrderStep2Props) {
  const {
    pedido,
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
  } = useReflectiveStep2Form({ header, onSuccess });

  if (isLoading) {
    return (
      <Loader
        className="py-12"
        title="Cargando prendas"
        message="Consultando qué prendas del pedido siguen pendientes de reflejar..."
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
   * El pedido desapareció del catálogo (otra orden lo cubrió al 100% mientras
   * este formulario estaba abierto: el backend excluye los pedidos sin ninguna
   * línea pendiente) o ya no queda nada por programar en él.
   */
  const sinPendiente = pedido === null || rows.length === 0 || availableRowsCount === 0;

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
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Pedido
          </p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
            {pedido?.folio ?? `Pedido #${header.pedido}`}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Cliente
          </p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
            {pedido?.cliente_nombre ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Sucursal
          </p>
          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">
            {pedido?.sucursal_nombre ?? "—"}
          </p>
        </div>
      </div>

      {/* ── Bloque de duplicado (409) ─────────────────────────────────────
          Ámbar informativo, NO rojo de validación: no es un error de captura
          del usuario, es un estado de negocio con una salida clara. Reemplaza
          al banner rosa —son mutuamente excluyentes, ver
          `useReflectiveStep2Form`—, nunca se muestran ambos a la vez. */}
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
                  {/* El folio puede llegar vacío si el 409 lo omite; sin este
                      respaldo el botón se quedaría sin texto y colapsaría a
                      ancho cero, dejando invisible la única vía hacia la orden
                      existente. */}
                  {duplicate.existingOrder.folio || `Orden #${duplicate.existingOrder.id}`}
                </button>
              </span>
              {/* Mismo motivo: sin estatus, la etiqueta quedaría colgando. */}
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
            {/* Marca visible mientras la recarga sigue en vuelo: sin ella, los
                inputs muestran todavía lo que el servidor acaba de rechazar y
                el aviso se lee como si ya estuvieran corregidos. */}
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
          `issueLines` se pinta COMPLETO, no solo el primer renglón: cuando
          viene del backend son los `detalles_exceso` (una línea por prenda que
          se pasa del cupo), y quedarse con el primero obligaría al usuario a
          reenviar tantas veces como líneas tenga mal. Los strings del backend
          se muestran TAL CUAL: son su texto de diagnóstico, no un contrato del
          que se pueda reconstruir nada. */}
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

      <fieldset disabled={isPending} className="space-y-5">
        {sinPendiente ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <InfoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {rows.length === 0
                  ? "Este pedido ya no tiene prendas por reflejar"
                  : "Todas las prendas de este pedido ya están programadas"}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Otra orden de reflejante pudo haberlas cubierto mientras este formulario
                estaba abierto. Regresa para elegir otro pedido.
              </p>
            </div>
          </div>
        ) : (
          <ReflectiveOrderLinesTable
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
        )}
      </fieldset>

      {/* ── Aviso de permanencia ─────────────────────────────────────────
          Sigue siendo cierto que la orden nace en Pendiente, consume folio y
          no se puede editar ni cambiar de estatus (el backend no expone
          `PUT`/`PATCH`). Lo que CAMBIÓ es que ya no cubre por fuerza el pedido
          completo: lo que quede fuera puede programarse después en otra orden,
          así que el aviso lo dice en vez de dejar creer que esta es la única
          oportunidad. */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
      >
        <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <p className="min-w-0 flex-1 text-xs text-amber-700 dark:text-amber-300">
          La orden se crea con estatus <strong>Pendiente</strong> y consume un folio de la
          serie. No es posible editarla ni cambiar su estatus después. Lo que dejes fuera
          seguirá pendiente y podrá programarse en otra orden.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <FormSecondaryButton label="Regresar" onClick={onBack} disabled={isPending} />
        {/* `disabled` DEBE incluir `isPending`: `FormSubmitButton` esparce
            `{...props}` después de su `disabled` interno, así que un `disabled`
            propio lo sobrescribe — hay que "hornear" el pending aquí para que el
            botón quede realmente inhabilitado durante el envío (sin doble POST,
            que consumiría un segundo folio). */}
        {/* `isFetching` también bloquea: mientras la recarga de pendientes está
            en vuelo, lo que hay en los inputs es todavía lo que el servidor
            rechazó, y reenviarlo solo gasta otro viaje para recibir el mismo
            400. */}
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Creando..."
          disabled={isPending || isFetching || sinPendiente || selectedCount === 0}
        >
          Crear orden de reflejante
        </FormSubmitButton>
      </div>
    </form>
  );
}
