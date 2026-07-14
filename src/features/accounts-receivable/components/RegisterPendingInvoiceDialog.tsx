"use client";

/**
 * RegisterPendingInvoiceDialog
 *
 * Diálogo de un paso para registrar manualmente una factura pendiente por
 * cobrar (`POST /finanzas/facturas/registrar-pendiente-cobro/`). El backend crea
 * la factura y su cuenta por cobrar en la misma operación.
 *
 * El cuerpo (formulario + hook) vive en un componente interno que solo se monta
 * cuando el diálogo está abierto: así los catálogos (clientes, monedas, pedidos)
 * se cargan bajo demanda y el estado se reinicia al cerrar (Radix desmonta el
 * contenido). Sigue el patrón de `CreateInvoiceDialog` / `StockMovementForm`.
 */

import { useState } from "react";
import { useStore } from "@tanstack/react-form";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { Loader } from "@/src/components/Loader";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { useRegisterPendingInvoiceForm } from "../hooks/useRegisterPendingInvoiceForm";
import { MONEY_REGEX, toCents } from "../schemas/register-pending-invoice.schema";
import type { Order } from "@/src/features/orders/interfaces/order.interface";

function RegisterPendingInvoiceForm({ onClose }: { onClose: () => void }) {
  const {
    form,
    isPending,
    isLoadingCatalogs,
    isErrorCatalogs,
    customerOptions,
    currencyOptions,
    getPedidoOptions,
    findPedido,
    getError,
    clearFieldError,
    handleFormSubmit,
    handleReset,
  } = useRegisterPendingInvoiceForm({ onSuccess: onClose });

  // Suscripciones reactivas para el filtro de pedidos y el total esperado.
  const clienteValue = useStore(form.store, (s) => s.values.cliente);
  const monedaValue = useStore(form.store, (s) => s.values.moneda);
  const subtotalValue = useStore(form.store, (s) => s.values.subtotal);
  const descuentoValue = useStore(form.store, (s) => s.values.descuento);
  const impuestosValue = useStore(form.store, (s) => s.values.impuestos);
  const totalValue = useStore(form.store, (s) => s.values.total);

  const pedidoOptions = getPedidoOptions(clienteValue, monedaValue);
  const pedidoDisabled = clienteValue < 1 || monedaValue < 1;

  // Total esperado (subtotal − descuento + impuestos), solo cuando el subtotal
  // es un monto válido. Sirve de guía; la validación real corre en el submit.
  const amountsValid = [subtotalValue, descuentoValue, impuestosValue].every((v) =>
    MONEY_REGEX.test(v),
  );
  const expectedTotalCents = amountsValid
    ? toCents(subtotalValue) - toCents(descuentoValue) + toCents(impuestosValue)
    : null;
  const totalMatches =
    expectedTotalCents !== null &&
    MONEY_REGEX.test(totalValue) &&
    toCents(totalValue) === expectedTotalCents;

  // El total mínimo que el schema acepta es 0.01 (`requiredMoney` exige > 0 y
  // `MONEY_REGEX` rechaza negativos). Si el total esperado cae por debajo, los
  // importes capturados son inconsistentes (p. ej. descuento > subtotal +
  // impuestos): ofrecer "Usar" escribiría un valor condenado a fallar la
  // validación, así que no se ofrece —el usuario debe corregir los importes—.
  const expectedTotalSubmittable =
    expectedTotalCents !== null && expectedTotalCents >= 1;

  const applyExpectedTotal = () => {
    if (expectedTotalCents === null || expectedTotalCents < 1) return;
    form.setFieldValue("total", (expectedTotalCents / 100).toFixed(2));
    clearFieldError("total");
  };

  /** Vuelve subtotal/descuento/impuestos/total a su estado vacío (= DEFAULT_VALUES). */
  const clearAmountFields = () => {
    form.setFieldValue("subtotal", "");
    form.setFieldValue("descuento", "0.00");
    form.setFieldValue("impuestos", "0.00");
    form.setFieldValue("total", "");
    clearFieldError("subtotal");
    clearFieldError("descuento");
    clearFieldError("impuestos");
    clearFieldError("total");
  };

  /**
   * El pedido no expone montos de "descuento"/"impuestos" propios que encajen en
   * el modelo del formulario, así que se derivan del delta gran_total − subtotal
   * (en centavos). Ese delta puede ser:
   *   • positivo → cargos/impuestos netos (ieps, flete, seguros, iva): va a
   *     `impuestos`.
   *   • negativo → descuento neto (descuento_global supera a los cargos): va a
   *     `descuento` (como magnitud positiva).
   * Colocar el delta en el campo según su signo mantiene ambos importes >= 0
   * (nunca un negativo que `MONEY_REGEX` rechazaría) y hace que la identidad
   * cruzada total = subtotal − descuento + impuestos del schema se cumpla exacta
   * para cualquier pedido, ya que `total` siempre es `gran_total`.
   */
  const applyPedidoAmounts = (order: Order) => {
    const deltaCents = toCents(order.gran_total) - toCents(order.subtotal);
    const descuento = deltaCents < 0 ? (-deltaCents / 100).toFixed(2) : "0.00";
    const impuestos = deltaCents > 0 ? (deltaCents / 100).toFixed(2) : "0.00";
    form.setFieldValue("subtotal", order.subtotal);
    form.setFieldValue("descuento", descuento);
    form.setFieldValue("impuestos", impuestos);
    form.setFieldValue("total", order.gran_total);
    clearFieldError("subtotal");
    clearFieldError("descuento");
    clearFieldError("impuestos");
    clearFieldError("total");
  };

  // ── Acoplamiento pedido → importes (fuente única) ────────────────────────
  // Todo cambio de pedido pasa por aquí: auto-llena los importes desde el pedido
  // seleccionado, o los limpia si no hay pedido (id 0) o el pedido no es
  // seleccionable. Lo invocan los tres onChange que tocan el pedido.
  const syncAmountsForPedido = (pedidoId: number) => {
    const order = pedidoId > 0 ? findPedido(pedidoId) : undefined;
    if (order) {
      applyPedidoAmounts(order);
    } else {
      clearAmountFields();
    }
  };

  // Cliente y moneda son las FK que filtran los pedidos: al cambiar cualquiera,
  // el pedido elegido deja de ser válido, así que se resetea a 0 y sus importes
  // se limpian. Fuente única para los onChange de cliente y moneda.
  const resetPedido = () => {
    form.setFieldValue("pedido", 0);
    syncAmountsForPedido(0);
  };

  if (isLoadingCatalogs) {
    return (
      <Loader
        className="py-12"
        title="Cargando catálogos"
        message="Obteniendo clientes, monedas y pedidos..."
      />
    );
  }

  // Si algún catálogo (clientes/monedas/pedidos) falló, no se renderiza el
  // formulario con selects vacíos —que se confundirían con catálogos vacíos—:
  // se muestra un error explícito. Mismo patrón que `PurchaseOrderOnboardingStep1`.
  if (isErrorCatalogs) {
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

  return (
    <form onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="space-y-5">
        {/* ── Cliente y moneda ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.Field name="cliente">
            {(field) => (
              <FormSelect
                label="Cliente *"
                name={field.name}
                value={field.state.value}
                options={[
                  { value: 0, label: "Seleccionar cliente..." },
                  ...customerOptions,
                ]}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  field.handleChange(Number.isNaN(next) ? 0 : next);
                  clearFieldError("cliente");
                  // El pedido depende del cliente: se resetea al cambiarlo, junto
                  // con los montos que hubiera auto-llenado.
                  resetPedido();
                }}
                onBlur={field.handleBlur}
                error={getError("cliente")}
              />
            )}
          </form.Field>

          <form.Field name="moneda">
            {(field) => (
              <FormSelect
                label="Moneda *"
                name={field.name}
                value={field.state.value}
                options={[
                  { value: 0, label: "Seleccionar moneda..." },
                  ...currencyOptions,
                ]}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  field.handleChange(Number.isNaN(next) ? 0 : next);
                  clearFieldError("moneda");
                  // El pedido depende de la moneda: se resetea al cambiarla, junto
                  // con los montos que hubiera auto-llenado.
                  resetPedido();
                }}
                onBlur={field.handleBlur}
                error={getError("moneda")}
              />
            )}
          </form.Field>
        </div>

        {/* ── Pedido (opcional, filtrado por cliente + moneda) ─────────── */}
        <form.Field name="pedido">
          {(field) => (
            <FormSelect
              label="Pedido (opcional)"
              name={field.name}
              value={field.state.value}
              disabled={pedidoDisabled}
              options={[
                {
                  value: 0,
                  label: pedidoDisabled
                    ? "Selecciona cliente y moneda primero..."
                    : pedidoOptions.length === 0
                      ? "Sin pedidos para este cliente y moneda"
                      : "Sin pedido",
                },
                ...pedidoOptions,
              ]}
              onChange={(event) => {
                const next = Number(event.target.value);
                const pedidoId = Number.isNaN(next) ? 0 : next;
                field.handleChange(pedidoId);
                clearFieldError("pedido");
                syncAmountsForPedido(pedidoId);
              }}
              onBlur={field.handleBlur}
              error={getError("pedido")}
            />
          )}
        </form.Field>

        {/* ── Folio y vencimiento ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form.Field name="folio">
            {(field) => (
              <FormInput
                label="Folio (opcional)"
                placeholder="Se genera automáticamente si lo dejas vacío"
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearFieldError("folio");
                }}
                onBlur={field.handleBlur}
                error={getError("folio")}
              />
            )}
          </form.Field>

          <form.Field name="fecha_vencimiento">
            {(field) => (
              <FormInput
                label="Fecha de vencimiento (opcional)"
                type="date"
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearFieldError("fecha_vencimiento");
                }}
                onBlur={field.handleBlur}
                error={getError("fecha_vencimiento")}
              />
            )}
          </form.Field>
        </div>

        {/* ── Importes ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <form.Field name="subtotal">
            {(field) => (
              <FormInput
                label="Subtotal *"
                inputMode="decimal"
                placeholder="0.00"
                leading="$"
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearFieldError("subtotal");
                }}
                onBlur={field.handleBlur}
                error={getError("subtotal")}
              />
            )}
          </form.Field>

          <form.Field name="descuento">
            {(field) => (
              <FormInput
                label="Descuento"
                inputMode="decimal"
                placeholder="0.00"
                leading="$"
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearFieldError("descuento");
                }}
                onBlur={field.handleBlur}
                error={getError("descuento")}
              />
            )}
          </form.Field>

          <form.Field name="impuestos">
            {(field) => (
              <FormInput
                label="Impuestos"
                inputMode="decimal"
                placeholder="0.00"
                leading="$"
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearFieldError("impuestos");
                }}
                onBlur={field.handleBlur}
                error={getError("impuestos")}
              />
            )}
          </form.Field>
        </div>

        {/* ── Total + guía de cálculo ──────────────────────────────────── */}
        <div>
          <form.Field name="total">
            {(field) => (
              <FormInput
                label="Total *"
                inputMode="decimal"
                placeholder="0.00"
                leading="$"
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearFieldError("total");
                }}
                onBlur={field.handleBlur}
                error={getError("total")}
              />
            )}
          </form.Field>

          {expectedTotalCents !== null && (
            <div className="mt-1.5 flex items-center gap-2 text-[11px]">
              <span
                className={
                  totalMatches
                    ? "text-slate-500 dark:text-slate-400"
                    : "text-amber-600 dark:text-amber-400 font-medium"
                }
              >
                Total esperado: {formatCurrency(expectedTotalCents / 100)}
              </span>
              {!totalMatches && expectedTotalSubmittable && (
                <button
                  type="button"
                  onClick={applyExpectedTotal}
                  className="rounded-md border border-sky-200 px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/10 transition-colors cursor-pointer"
                >
                  Usar
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Referencia y observaciones ───────────────────────────────── */}
        <form.Field name="referencia">
          {(field) => (
            <FormInput
              label="Referencia (opcional)"
              placeholder="Ej. PENDIENTE-JULIO"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldError("referencia");
              }}
              onBlur={field.handleBlur}
              error={getError("referencia")}
            />
          )}
        </form.Field>

        <form.Field name="observaciones">
          {(field) => (
            <FormTextarea
              label="Observaciones (opcional)"
              rows={3}
              placeholder="Notas de la factura pendiente por cobrar"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldError("observaciones");
              }}
              onBlur={field.handleBlur}
              error={getError("observaciones")}
            />
          )}
        </form.Field>
      </fieldset>

      {/* ── Acciones ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-5">
        <FormCancelButton onClick={handleReset} disabled={isPending} />
        <FormSubmitButton isPending={isPending} loadingLabel="Registrando...">
          Registrar CxC
        </FormSubmitButton>
      </div>
    </form>
  );
}

/**
 * Punto de entrada renderizado como `actionButton` de la tabla de CxC. Es
 * autónomo: controla su propio estado de apertura y conserva el botón primario
 * "+ Registrar CxC" existente.
 */
export const RegisterPendingInvoiceDialog = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MainDialog
      title={
        <DialogHeader
          title="Registrar Factura Pendiente por Cobrar"
          subtitle="Genera la factura y su cuenta por cobrar"
          statusColor="sky"
        />
      }
      open={isOpen}
      onOpenChange={setIsOpen}
      maxWidth="620px"
      showCloseButton={false}
      trigger={
        <Button variant="primary" rounded="full" onClick={() => setIsOpen(true)}>
          + Registrar CxC
        </Button>
      }
    >
      {isOpen && <RegisterPendingInvoiceForm onClose={() => setIsOpen(false)} />}
    </MainDialog>
  );
};
