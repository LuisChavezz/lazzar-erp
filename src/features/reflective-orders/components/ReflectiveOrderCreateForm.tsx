"use client";

import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { Loader } from "@/src/components/Loader";
import {
  ExclamationTriangleIcon,
  FolioIcon,
  InfoIcon,
  RefreshIcon,
  UserIcon,
} from "@/src/components/Icons";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { useReflectiveOrderForm } from "../hooks/useReflectiveOrderForm";

/**
 * Opciones de prioridad. El mapeo 1 = Alta, 2 = Media, 3 = Baja es EL MISMO que
 * ya usan `EmbroideryOrderCreateForm` y `ProductionOrderStep1`, y el mismo que
 * pinta `REFLECTIVE_ORDER_PRIORITY_CONFIG` en el badge del listado — de nada
 * serviría capturar "Urgente" aquí y que la tabla lo rotulara "Alta". El
 * backend declara `prioridad` como entero libre (`IntegerField(default=1)`, sin
 * `choices`), así que este conjunto cerrado es una convención del frontend, no
 * una regla del API. Ver la nota del schema.
 */
const PRIORIDAD_OPTIONS = [
  { value: 1, label: "Alta" },
  { value: 2, label: "Media" },
  { value: 3, label: "Baja" },
];

interface ReflectiveOrderCreateFormProps {
  /** Se invoca tras crear la orden correctamente (cierra el diálogo). */
  onSuccess: () => void;
  /**
   * Abre el diálogo de detalle (`ReflectiveOrderDetailDialog`, montado en
   * `ReflectiveOrdersView`) para el `id` dado. Se usa desde el bloque de
   * duplicado (409) para llevar al folio de la orden YA EXISTENTE — no navega a
   * ninguna ruta, es la misma mecánica de estado (`openOrderId`) que ya abre el
   * detalle desde el listado, solo que alimentada con
   * `duplicate.existingOrder.id` en vez del id de una fila. El diálogo de
   * detalle no se cierra al abrir este (diálogos apilados).
   */
  onViewExistingOrder: (id: number) => void;
}

/**
 * Alta de orden de reflejante en UN SOLO PASO.
 *
 * Deliberadamente NO es un asistente por pasos (a diferencia de
 * picking/packing): el cuerpo del POST es `{ pedido, prioridad?, observaciones? }`
 * y nada más — el backend deriva los renglones solo, uno por cada talla del
 * pedido con `lleva_reflejante=True`. No hay selección por línea ni cantidades
 * que capturar, así que un "Paso 1 / Paso 2" solo agregaría pantallas. Mismo
 * criterio —y mismo precedente— que `EmbroideryOrderCreateForm`.
 *
 * Lo que NO se muestra, a propósito:
 *  - Un selector de operador funcional: `usuario_asignado` está en los
 *    `read_only_fields` del serializer y el service lo fija al usuario
 *    autenticado, así que se muestra en solo lectura. Un `<select>` habilitado
 *    prometería una decisión inexistente. (Los `operadores` del onboarding se
 *    usan solo para RESOLVER EL NOMBRE del usuario en sesión, ver
 *    `resolveAssignedOperator`.)
 *  - Campos para `estatus_reflejante` y `fecha_fin`: el serializer los acepta
 *    —no están en `read_only_fields`, a diferencia de bordado— pero el service
 *    los descarta. Capturarlos sería pedirle al usuario una decisión que se
 *    tira a la basura.
 *
 * Lo que SÍ se muestra y bordado no: el folio sugerido del onboarding, rotulado
 * explícitamente como APROXIMADO. Bordado lo oculta por no ser confiable; aquí
 * se prefirió enseñarlo con su salvedad a la vista, porque adelanta el formato
 * y la serie que va a consumirse. El folio definitivo sigue siendo el de la
 * respuesta del POST (el toast de `useCreateReflectiveOrder`).
 */
export function ReflectiveOrderCreateForm({
  onSuccess,
  onViewExistingOrder,
}: ReflectiveOrderCreateFormProps) {
  const {
    form,
    pedidoOptions,
    operadorAsignado,
    folioPreview,
    isLoadingCatalog,
    isErrorCatalog,
    catalogError,
    refetchCatalog,
    isPending,
    serverBanner,
    duplicate,
    dismissBanner,
    dismissDuplicate,
    getError,
    clearError,
    handleFormSubmit,
  } = useReflectiveOrderForm({ onSuccess });

  // ── Carga del catálogo ────────────────────────────────────────────────────
  if (isLoadingCatalog) {
    return (
      <Loader
        title="Cargando pedidos"
        message="Consultando qué pedidos tienen prendas con reflejante..."
      />
    );
  }

  if (isErrorCatalog) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 space-y-3 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          No se pudieron cargar los pedidos
        </p>
        <p className="text-xs text-red-500 dark:text-red-300">
          {extractErrorMessage(catalogError, "Vuelve a intentarlo en un momento.")}
        </p>
        <button
          type="button"
          onClick={() => void refetchCatalog()}
          className="inline-flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:underline cursor-pointer"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
          Reintentar
        </button>
      </div>
    );
  }

  // Catálogo legítimamente vacío: no hay nada que dar de alta.
  if (pedidoOptions.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
          <InfoIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            No hay pedidos con prendas de reflejante
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Solo aparecen aquí los pedidos activos de tus sucursales que tengan al menos
            una talla marcada para reflejante.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="w-full space-y-5">
      {/* ── Bloque de duplicado (409) ─────────────────────────────────────
          Ámbar informativo, NO rojo de validación: no es un error de captura
          del usuario, es un estado de negocio ("ya existe una OR con el 100%
          de las prendas") con una salida clara ("contacte a producción").
          Reemplaza al banner rosa —son mutuamente excluyentes, ver
          `useReflectiveOrderForm`—, nunca se muestran ambos a la vez. */}
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
                {/* Abre el MISMO diálogo de detalle que "Ver Detalles" en el
                    listado, sin fetch propio ni navegación:
                    `duplicate.existingOrder.id` es justo el `id` que ese
                    diálogo ya sabe resolver contra la lista en caché (que la
                    mutación acaba de invalidar precisamente para esto, ver
                    `useCreateReflectiveOrder`). */}
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

      {/* ── Banner de error del backend ──────────────────────────────────── */}
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

      <fieldset disabled={isPending} className="space-y-5">
        {/* ── Pedido ─────────────────────────────────────────────────────── */}
        <form.Field name="pedido">
          {(field) => (
            <FormSelect
              label="Pedido"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(Number(event.target.value));
                clearError("pedido");
              }}
              onBlur={field.handleBlur}
              error={getError("pedido")}
            >
              <option value="0" disabled>
                Seleccionar pedido...
              </option>
              {pedidoOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                >
                  {option.label}
                </option>
              ))}
            </FormSelect>
          )}
        </form.Field>

        <p className="-mt-3 ml-1 text-[11px] text-slate-500">
          Las prendas a las que se aplica el reflejante se toman automáticamente del
          pedido: se genera un renglón por cada talla marcada para reflejante.
        </p>

        {/* ── Prioridad ──────────────────────────────────────────────────── */}
        <form.Field name="prioridad">
          {(field) => (
            <FormSelect
              label="Prioridad"
              name={field.name}
              options={PRIORIDAD_OPTIONS}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(Number(event.target.value));
                clearError("prioridad");
              }}
              onBlur={field.handleBlur}
              error={getError("prioridad")}
            />
          )}
        </form.Field>

        {/* ── Operador asignado (solo lectura) ───────────────────────────── */}
        <div className="w-full">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">
            Operador asignado
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
            <UserIcon className="w-4 h-4 shrink-0 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {operadorAsignado}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 ml-1">
            La orden se asigna siempre a quien la crea; no es posible asignarla a otro
            usuario.
          </p>
        </div>

        {/* ── Observaciones ──────────────────────────────────────────────────
            SIN `forceUppercase`: ese prop existe solo en `FormInput` (campos de
            clave/código de los catálogos: `BranchForm`, `ColorForm`,
            `CurrencyForm`…), no en `FormTextarea`, y el `observaciones` de
            bordado —el precedente directo— tampoco lo usa. Son notas en prosa,
            no una clave normalizada. */}
        <form.Field name="observaciones">
          {(field) => (
            <FormTextarea
              label="Observaciones (opcional)"
              name={field.name}
              placeholder="Notas de la orden de reflejante"
              rows={2}
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
      </fieldset>

      {/* ── Folio tentativo ───────────────────────────────────────────────────
          Se muestra SIEMPRE con la salvedad pegada al número, nunca como dato
          firme: el backend lo calcula con la sucursal POR DEFECTO del usuario y
          el folio real se consume con la de EL PEDIDO, que puede ser otra
          (`SerieFolio` va por sucursal). El bloque se omite por completo cuando
          llega `null` —usuario sin `sucursal_default`— en vez de pintar un
          hueco. */}
      {folioPreview && (
        <div
          role="note"
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 px-4 py-3"
        >
          <FolioIcon className="w-5 h-5 shrink-0 text-slate-400 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold">Folio tentativo: </span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                {folioPreview}
              </span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Es una <strong>estimación</strong>, no el folio definitivo: se calcula con tu
              sucursal predeterminada y la serie que se consume es la de la sucursal del
              pedido. El folio real se confirma al crear la orden.
            </p>
          </div>
        </div>
      )}

      {/* ── Aviso de permanencia + botón ─────────────────────────────────── */}
      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20 px-4 py-3"
      >
        <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <p className="min-w-0 flex-1 text-xs text-amber-700 dark:text-amber-300">
          La orden se crea con estatus <strong>Pendiente</strong> y consume un folio de la
          serie. No es posible editarla, cancelarla ni cambiar su estatus después.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        {/* `disabled` DEBE incluir `isPending`: `FormSubmitButton` esparce
            `{...props}` después de su `disabled` interno, así que un `disabled`
            propio lo sobrescribe — hay que "hornear" el pending aquí para que
            el botón quede realmente inhabilitado durante el envío. */}
        <FormSubmitButton
          isPending={isPending}
          loadingLabel="Creando..."
          disabled={isPending}
        >
          Crear orden de reflejante
        </FormSubmitButton>
      </div>
    </form>
  );
}
