"use client";

import { useIsMutating } from "@tanstack/react-query";
import { MainDialog } from "@/src/components/MainDialog";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { FormInput } from "@/src/components/FormInput";
import {
  FormCancelButton,
  FormSecondaryButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { EmptyLines, LineItemsTable } from "@/src/components/DetailDialogPrimitives";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import {
  isValidOpId,
  useProductionOrderCriticalPath,
} from "@/src/features/production-order-critical-path/hooks/useProductionOrderCriticalPath";
import { recalculateConsumptionMutationKey } from "../hooks/useRecalculateProductionOrderConsumption";
import { useRecalculateConsumptionForm } from "../hooks/useRecalculateConsumptionForm";
import type { RecalculateConsumptionResponse } from "../interfaces/production-order-consumption.interface";
import {
  productFallbackName,
  type ProductConsumption,
} from "../utils/summarizeConsumption";
import {
  formatBackendQuantity,
  formatSignedBackendQuantity,
} from "../utils/formatConsumptionQuantity";

interface RecalculateConsumptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opId: number;
  folio: string;
  /** Productos con consumo en la OP (`summarizeConsumption`). Se copian al abrir. */
  products: ProductConsumption[];
}

/**
 * Diálogo "Recalcular consumos" de una OP: captura → confirmación →
 * resultado. El estado de apertura es de la PÁGINA; aquí se toma la foto de
 * los productos al abrir (`useDialogSession`), así que un refetch del detalle
 * con el diálogo abierto —el propio recálculo lo provoca— no mueve la lista
 * ni los nombres del resultado.
 *
 * No se cierra a media petición: el POST mueve inventario y su resultado (o su
 * error) debe verse.
 */
export function RecalculateConsumptionDialog({
  open,
  onOpenChange,
  opId,
  folio,
  products,
}: RecalculateConsumptionDialogProps) {
  const session = useDialogSession(open, products);
  const isRecalculating =
    useIsMutating({ mutationKey: recalculateConsumptionMutationKey(opId) }) > 0;

  const handleOpenChange = (next: boolean) => {
    if (!next && isRecalculating) return;
    onOpenChange(next);
  };

  return (
    <MainDialog
      open={open}
      onOpenChange={handleOpenChange}
      maxWidth="760px"
      showCloseButton={false}
      title={`Recalcular consumos · ${folio || `OP #${opId}`}`}
      description="Ajusta el consumo de material de la orden a las piezas realmente cortadas."
    >
      <RecalculateConsumptionContent
        key={session.id}
        opId={opId}
        products={session.snapshot}
        onClose={() => handleOpenChange(false)}
      />
    </MainDialog>
  );
}

// ── Contenido (se monta en cada apertura) ─────────────────────────────────────

interface RecalculateConsumptionContentProps {
  opId: number;
  products: ProductConsumption[];
  onClose: () => void;
}

/**
 * Cantidad guardada en la ruta crítica ("100.00", decimal(12,2)) como texto
 * del input ("100"). Solo se quitan ceros de la fracción: una fracción real
 * ("120.50") se muestra tal cual y la validación pide corregirla. Mismo
 * criterio que el formulario de la ruta crítica.
 */
const toCantidadInput = (stored: string | null): string =>
  stored === null ? "" : stored.replace(/\.0*$/, "");

/**
 * Espera la lectura FRESCA de la ruta crítica (`isFetchedAfterMount`; el hook
 * la pide en cada montaje) para precargar `cantidad_real_corte`, y entonces
 * monta el formulario una sola vez: un refetch posterior no lo reinicia.
 */
function RecalculateConsumptionContent({
  opId,
  products,
  onClose,
}: RecalculateConsumptionContentProps) {
  const validId = isValidOpId(opId);
  const { data, error, isInitialError, isFetchedAfterMount, isFetching, refetch } =
    useProductionOrderCriticalPath(opId);

  if (!validId || isInitialError) {
    const notFound = !validId || isNotFoundError(error);
    return (
      <div className="space-y-4">
        <ErrorState
          title={
            notFound
              ? "Orden de producción no encontrada"
              : "No se pudo leer la cantidad real de corte"
          }
          message={
            notFound
              ? "La orden de producción ya no existe o no pertenece a tu empresa."
              : (firstDrfFieldMessage(error) ??
                "Falló la conexión con el servidor. Intenta de nuevo.")
          }
        />
        <div className="flex justify-end gap-3">
          {!notFound && (
            <FormSecondaryButton
              label={isFetching ? "Reintentando…" : "Reintentar"}
              disabled={isFetching}
              onClick={() => void refetch()}
            />
          )}
          <FormCancelButton label="Cerrar" onClick={onClose} />
        </div>
      </div>
    );
  }

  if (!data || !isFetchedAfterMount) {
    return (
      <div className="space-y-4">
        <Loader
          className="py-10"
          title="Cargando"
          message="Leyendo la cantidad real de corte de la orden..."
        />
        <div className="flex justify-end">
          <FormCancelButton label="Cerrar" onClick={onClose} />
        </div>
      </div>
    );
  }

  return (
    <RecalculateConsumptionSteps
      opId={opId}
      products={products}
      initialCantidad={toCantidadInput(data.cantidad_real_corte)}
      onClose={onClose}
    />
  );
}

// ── Pasos ─────────────────────────────────────────────────────────────────────

interface RecalculateConsumptionStepsProps {
  opId: number;
  products: ProductConsumption[];
  initialCantidad: string;
  onClose: () => void;
}

function RecalculateConsumptionSteps({
  opId,
  products,
  initialCantidad,
  onClose,
}: RecalculateConsumptionStepsProps) {
  const {
    form,
    step,
    confirmedBody,
    result,
    formMessage,
    isPending,
    getError,
    clearFieldErrors,
    validateField,
    handleFormSubmit,
    backToForm,
    confirm,
  } = useRecalculateConsumptionForm({ opId, initialCantidad });

  const productName = (producto: number) =>
    products.find((product) => product.producto === producto)?.producto_nombre ??
    productFallbackName(producto);

  return (
    <>
      {/* La captura se OCULTA (no se desmonta) en los otros pasos: así lo
          tecleado y lo marcado siguen ahí al volver, también tras un error. */}
      <form onSubmit={handleFormSubmit} noValidate hidden={step !== "form"}>
        <div className="max-h-[calc(100dvh-19rem)] min-h-32 overflow-y-auto -mx-1 px-1 py-1 space-y-5">
          {formMessage && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/5 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-400"
            >
              {formMessage}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <form.Field name="cantidad_real_corte">
              {(field) => (
                <div>
                  <FormInput
                    label="Cantidad real de corte (pzas)"
                    // Texto y NO `type="number"`, como en la ruta crítica: lo
                    // tecleado se queda tal cual y el schema lo valida.
                    inputMode="numeric"
                    placeholder="0"
                    name={field.name}
                    value={field.state.value}
                    error={getError("cantidad_real_corte")}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("cantidad_real_corte");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("cantidad_real_corte", field.state.value);
                    }}
                  />
                  <p className="ml-1 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Se guarda también en la ruta crítica de la orden.
                  </p>
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="productos">
            {(field) => {
              const selected = field.state.value;
              const toggle = (producto: number, checked: boolean) => {
                const next = checked
                  ? [...selected, producto]
                  : selected.filter((id) => id !== producto);
                field.handleChange(next);
                clearFieldErrors("productos");
              };
              const fieldError = getError("productos");
              return (
                <fieldset>
                  <legend className="ml-1 mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Productos a recalcular
                  </legend>
                  <p className="ml-1 mb-3 text-xs text-slate-500 dark:text-slate-400">
                    Marca los productos cuyo consumo debe ajustarse a lo cortado.
                  </p>
                  <div className="space-y-2">
                    {products.map((product) => {
                      const checked = selected.includes(product.producto);
                      return (
                        <label
                          key={product.producto}
                          className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-sky-500 dark:hover:border-sky-500 cursor-pointer transition-colors bg-slate-50/50 dark:bg-white/5"
                        >
                          <input
                            type="checkbox"
                            name={field.name}
                            checked={checked}
                            onChange={(event) => toggle(product.producto, event.target.checked)}
                            onBlur={field.handleBlur}
                            className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                          />
                          <span className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">
                            {product.producto_nombre}
                          </span>
                          <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400 tabular-nums text-right">
                            Planeado{" "}
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {formatBackendQuantity(product.planned)}
                            </span>
                            {" · "}Actual{" "}
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {formatBackendQuantity(product.current)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {fieldError && (
                    <p role="alert" className="ml-1 mt-2 text-xs text-red-600 font-medium">
                      {fieldError.message}
                    </p>
                  )}
                </fieldset>
              );
            }}
          </form.Field>
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-1 border-t border-slate-100 dark:border-white/10">
          <FormCancelButton label="Cancelar" onClick={onClose} />
          <FormSubmitButton>Continuar</FormSubmitButton>
        </div>
      </form>

      {step === "confirm" && confirmedBody && (
        <div className="space-y-4">
          <div
            role="alert"
            className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 px-4 py-3 space-y-2 text-sm text-amber-800 dark:text-amber-300"
          >
            <p className="font-semibold">Esta acción mueve inventario.</p>
            <p className="text-xs leading-relaxed">
              Se recalculará el consumo de {confirmedBody.productos.length}{" "}
              {confirmedBody.productos.length === 1 ? "producto" : "productos"} con{" "}
              <span className="font-semibold tabular-nums">
                {confirmedBody.cantidad_real_corte}
              </span>{" "}
              piezas cortadas. Si el consumo sube se registra una salida de almacén;
              si baja, una entrada a la existencia de origen. No hay vista previa:
              verás el resultado al terminar.
            </p>
          </div>
          <ul className="ml-1 space-y-1 text-sm text-slate-700 dark:text-slate-200 list-disc list-inside">
            {confirmedBody.productos.map((producto) => (
              <li key={producto}>{productName(producto)}</li>
            ))}
          </ul>
          <div className="flex justify-end gap-3 pt-4 mt-1 border-t border-slate-100 dark:border-white/10">
            <FormSecondaryButton label="Volver" onClick={backToForm} disabled={isPending} />
            <FormSubmitButton
              type="button"
              isPending={isPending}
              loadingLabel="Recalculando…"
              onClick={() => void confirm()}
            >
              Recalcular consumos
            </FormSubmitButton>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <RecalculateConsumptionResult
          result={result}
          productName={productName}
          onClose={onClose}
        />
      )}
    </>
  );
}

// ── Resultado ─────────────────────────────────────────────────────────────────

function RecalculateConsumptionResult({
  result,
  productName,
  onClose,
}: {
  result: RecalculateConsumptionResponse;
  productName: (producto: number) => string;
  onClose: () => void;
}) {
  const cantidad = formatBackendQuantity(result.cantidad_real_corte);

  return (
    <div className="space-y-4">
      <p role="status" className="ml-1 text-sm text-slate-600 dark:text-slate-300">
        Cantidad real de corte guardada:{" "}
        <span className="font-semibold tabular-nums text-slate-800 dark:text-white">
          {cantidad} pzas
        </span>
        .
      </p>

      {result.cambios.length === 0 ? (
        <EmptyLines>
          Sin cambios: el consumo de los productos seleccionados ya correspondía a{" "}
          {cantidad} piezas cortadas. No se movió inventario.
        </EmptyLines>
      ) : (
        <LineItemsTable
          head={
            <>
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="px-3 py-2 font-medium text-right">Antes</th>
              <th className="px-3 py-2 font-medium text-right">Después</th>
              <th className="px-3 py-2 font-medium text-right">Diferencia</th>
            </>
          }
        >
          {result.cambios.map((cambio) => (
            <tr key={cambio.producto_id}>
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                {productName(cambio.producto_id)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {formatBackendQuantity(cambio.consumido_antes)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">
                {formatBackendQuantity(cambio.consumido_despues)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                {formatSignedBackendQuantity(cambio.delta)}
              </td>
            </tr>
          ))}
        </LineItemsTable>
      )}

      <div className="flex justify-end pt-4 mt-1 border-t border-slate-100 dark:border-white/10">
        <FormCancelButton label="Cerrar" onClick={onClose} />
      </div>
    </div>
  );
}
