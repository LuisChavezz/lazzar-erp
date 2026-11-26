"use client";

import { AxiosError } from "axios";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { Loader } from "@/src/components/Loader";
import { MesaControlProgramadoIndicator } from "@/src/components/MesaControlProgramadoIndicator";
import { FolioIcon, InfoIcon, RefreshIcon, UserIcon } from "@/src/components/Icons";
import { forbiddenDetailMessage, isForbiddenError } from "@/src/utils/drfWriteErrors";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { useCorteMangaStep1Form } from "../hooks/useCorteMangaStep1Form";
import type { CreateCorteMangaOrderFormValues } from "../schemas/corte-manga-order.schema";

const CATALOG_ERROR_FALLBACK = "Vuelve a intentarlo en un momento.";

/**
 * Mensaje del panel de carga fallida del catálogo. El cuerpo del backend se
 * muestra SOLO en un 400 o un 403 (el `detail` de un `PermissionDenied`):
 * cualquier otro fallo —un 500 cuyo cuerpo es la página HTML de depuración de
 * Django, un 502, un error de red— cae al texto fijo. NO se usa
 * `extractErrorMessage`: su `error instanceof Error` lo satisface un
 * `AxiosError`, así que mostraría "Request failed with status code 500". Mismo
 * criterio que `ReflectiveOrderStep1` y que `parseCorteMangaOrderError`.
 */
const getCatalogErrorMessage = (error: unknown): string =>
  (isForbiddenError(error)
    ? forbiddenDetailMessage(error)
    : error instanceof AxiosError && error.response?.status === 400
      ? firstDrfFieldMessage(error)
      : undefined) ?? CATALOG_ERROR_FALLBACK;

interface CorteMangaOrderStep1Props {
  initialValues: CreateCorteMangaOrderFormValues;
  onNext: (values: CreateCorteMangaOrderFormValues) => void;
}

/**
 * Paso 1 del alta de orden de corte de manga: encabezado del documento. NO
 * manda nada, solo valida y avanza; el único POST del flujo vive en el Paso 2
 * (`CorteMangaOrderStep2`), con el banner de error y el aviso de duplicado.
 *
 * Lo que NO se muestra, a propósito:
 *  - Un selector de operador funcional: `usuario_asignado` está en los
 *    `read_only_fields` del serializer y el service lo fija al usuario
 *    autenticado, así que se muestra en solo lectura. (Los `operadores` del
 *    onboarding se usan SOLO para resolver el nombre del usuario en sesión, ver
 *    `resolveAssignedOperator`.)
 *  - Un campo de estatus: `estatus_corte` es `read_only` en el alta; la orden
 *    nace en Pendiente y se avanza después desde su ficha.
 *  - Un campo `fecha_fin`: el serializer lo acepta pero el service lo descarta.
 */
export function CorteMangaOrderStep1({ initialValues, onNext }: CorteMangaOrderStep1Props) {
  const {
    form,
    pedidoOptions,
    operadorAsignado,
    folioPreview,
    isLoadingCatalog,
    isErrorCatalog,
    catalogError,
    refetchCatalog,
    getError,
    clearError,
    handleFormSubmit,
  } = useCorteMangaStep1Form({ initialValues, onNext });

  if (isLoadingCatalog) {
    return (
      <Loader
        title="Cargando pedidos"
        message="Consultando qué pedidos tienen prendas con corte de manga..."
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
          {getCatalogErrorMessage(catalogError)}
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
            No hay pedidos con prendas de corte de manga pendientes
          </h3>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Solo aparecen aquí los pedidos activos de tus sucursales con al menos una talla
            marcada para corte de manga, programados por Mesa de Control a Corte de manga y
            con piezas todavía sin orden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="w-full space-y-4">
      <fieldset className="space-y-4">
        {/* ── Pedido ─────────────────────────────────────────────────────── */}
        <form.Field name="pedido">
          {(field) => {
            const selected = pedidoOptions.find((option) => option.value === field.state.value);
            return (
              <div className="space-y-1.5">
                <FormSelect
                  label="Pedido"
                  className="py-2!"
                  name={field.name}
                  // Si un refetch sacó al pedido elegido del catálogo, un
                  // `<select>` controlado con un valor sin `<option>` pintaría
                  // OTRO pedido como elegido. Se muestra el placeholder y el
                  // guard del envío pide elegir uno.
                  value={selected ? field.state.value : 0}
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
                      disabled={option.agotado}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {option.label}
                    </option>
                  ))}
                </FormSelect>
                <p className="ml-1 text-[11px] text-slate-500">
                  En el siguiente paso eliges qué tallas entran en la orden y con cuántas piezas.
                </p>
                {selected && (
                  <MesaControlProgramadoIndicator
                    programado={selected.programado}
                    saldo={selected.saldo}
                  />
                )}
              </div>
            );
          }}
        </form.Field>

        {/* ── Operador asignado (solo lectura) ───────────────────────────── */}
        <div className="w-full">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block">
            Operador asignado
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 py-2">
            <UserIcon className="w-4 h-4 shrink-0 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {operadorAsignado}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 ml-1">Se asigna a quien crea la orden.</p>
        </div>

        {/* ── Observaciones ─────────────────────────────────────────────────
            Sin `forceUppercase` (solo existe en `FormInput`): son notas en
            prosa, igual que en reflejante y bordado. */}
        <form.Field name="observaciones">
          {(field) => (
            <FormTextarea
              label="Observaciones (opcional)"
              name={field.name}
              placeholder="Notas de la orden de corte de manga"
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

      {/* ── Folio tentativo ─────────────────────────────────────────────────
          Siempre con la salvedad pegada al número: el backend lo calcula con la
          sucursal POR DEFECTO del usuario y el folio real se consume con la de
          EL PEDIDO. Se omite cuando llega `null`. */}
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

      <div className="flex items-center justify-end gap-3 pt-1">
        {/* Este botón NO crea nada: solo avanza. El aviso de permanencia vive en
            el Paso 2, junto al botón que de verdad la crea. */}
        <FormSubmitButton>Continuar</FormSubmitButton>
      </div>
    </form>
  );
}
