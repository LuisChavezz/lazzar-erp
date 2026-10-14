"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormSubmitButton } from "@/src/components/FormButtons";
import type { PurchaseOrderEncabezados, PurchaseOrderOnboardingData } from "../interfaces/purchase-order-onboarding.interface";
import { usePurchaseOrderOnboardingData } from "../hooks/usePurchaseOrderOnboardingData";
import { usePurchaseOrderStep1Form } from "../hooks/usePurchaseOrderStep1Form";
import { TIPO_COMPRA_OPTIONS } from "../constants/purchaseOrderTipoCompra";
import type { TipoCompra } from "../interfaces/purchase-order.interface";
import type { PurchaseOrderHeaderFieldErrors } from "../utils/purchaseOrderHeaderErrors";
import { PurchaseOrderPedidosField } from "./PurchaseOrderPedidosField";

export function PurchaseOrderOnboardingStep1({
  initialValues,
  initialServerErrors,
  onSuccess,
}: {
  /** Encabezado capturado previamente; preserva lo escrito al volver desde el Step 2. */
  initialValues?: PurchaseOrderEncabezados;
  /** Errores por campo con los que el backend rechazó el alta (ver el step manager). */
  initialServerErrors?: PurchaseOrderHeaderFieldErrors;
  onSuccess?: (data: PurchaseOrderEncabezados) => void;
}) {
  const { onboardingData, isLoading, isError, error } =
    usePurchaseOrderOnboardingData();

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-sm text-slate-500">
          Cargando datos de onboarding...
        </span>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          Error al cargar datos de onboarding
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  // Safety check — data must be available after loading and error are ruled out.
  if (!onboardingData) {
    return null;
  }

  // Defer to the actual form once data is available.
  return (
    <Step1Form
      onboardingData={onboardingData}
      initialValues={initialValues}
      initialServerErrors={initialServerErrors}
      onSuccess={onSuccess}
    />
  );
}

// ─── Inner form component (only rendered when data is ready) ──────────────

interface Step1FormProps {
  onboardingData: PurchaseOrderOnboardingData;
  initialValues?: PurchaseOrderEncabezados;
  initialServerErrors?: PurchaseOrderHeaderFieldErrors;
  onSuccess?: (data: PurchaseOrderEncabezados) => void;
}

function Step1Form({
  onboardingData,
  initialValues,
  initialServerErrors,
  onSuccess,
}: Step1FormProps) {
  const {
    form,
    isPending,
    handleFormSubmit,
    sucursalOptions,
    proveedorOptions,
    monedaOptions,
    getError,
    clearFieldErrors,
    validateField,
    coerceNumeric,
  } = usePurchaseOrderStep1Form({
    onboardingData,
    initialValues,
    initialServerErrors,
    onSuccess: onSuccess ?? (() => {}),
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <fieldset
        disabled={isPending}
        className={`space-y-6 transition-opacity duration-200 ${isPending ? "opacity-60" : ""}`}
      >
        {/* ── Sucursal ─────────────────────────────────────────────────── */}
        <form.Field name="orden_compra.sucursal">
          {(field) => (
            <FormSelect
              label="Sucursal"
              name={field.name}
              value={field.state.value}
              options={sucursalOptions}
              onChange={(event) => {
                const nextValue = coerceNumeric(
                  "orden_compra.sucursal",
                  event.target.value,
                ) as number;
                field.handleChange(nextValue);
                clearFieldErrors("orden_compra.sucursal");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("orden_compra.sucursal");
              }}
              error={getError("orden_compra.sucursal")}
            />
          )}
        </form.Field>

        {/* ── Proveedor ────────────────────────────────────────────────── */}
        <form.Field name="orden_compra.proveedor">
          {(field) => (
            <FormSelect
              label="Proveedor"
              name={field.name}
              value={field.state.value}
              options={proveedorOptions}
              onChange={(event) => {
                const nextValue = coerceNumeric(
                  "orden_compra.proveedor",
                  event.target.value,
                ) as number;
                field.handleChange(nextValue);
                clearFieldErrors("orden_compra.proveedor");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("orden_compra.proveedor");
              }}
              error={getError("orden_compra.proveedor")}
            />
          )}
        </form.Field>

        {/* ── Moneda ───────────────────────────────────────────────────── */}
        <form.Field name="orden_compra.moneda">
          {(field) => (
            <FormSelect
              label="Moneda"
              name={field.name}
              value={field.state.value}
              options={monedaOptions}
              onChange={(event) => {
                const nextValue = coerceNumeric(
                  "orden_compra.moneda",
                  event.target.value,
                ) as number;
                field.handleChange(nextValue);
                clearFieldErrors("orden_compra.moneda");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("orden_compra.moneda");
              }}
              error={getError("orden_compra.moneda")}
            />
          )}
        </form.Field>

        {/* ── Tipo de compra ───────────────────────────────────────────────
            Decide la serie del folio al confirmar la orden. */}
        <form.Field name="orden_compra.tipo_compra">
          {(field) => (
            <FormSelect
              label="Tipo de compra"
              name={field.name}
              value={field.state.value}
              options={TIPO_COMPRA_OPTIONS}
              onChange={(event) => {
                field.handleChange(event.target.value as TipoCompra);
                clearFieldErrors("orden_compra.tipo_compra");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("orden_compra.tipo_compra");
              }}
              error={getError("orden_compra.tipo_compra")}
            />
          )}
        </form.Field>

        {/* ── Fecha de vencimiento (opcional) ───────────────────────────
            La fecha de generación (`fecha_oc`) no se captura: la fija el
            servidor al crear la orden. */}
        <form.Field name="orden_compra.fecha_vencimiento">
          {(field) => (
            <FormInput
              label="Fecha de vencimiento"
              type="date"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("orden_compra.fecha_vencimiento");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("orden_compra.fecha_vencimiento");
              }}
              error={getError("orden_compra.fecha_vencimiento")}
            />
          )}
        </form.Field>

        {/* ── Referencia (opcional) ─────────────────────────────────────── */}
        <form.Field name="orden_compra.referencia">
          {(field) => (
            <FormInput
              label="Referencia"
              placeholder="Compra inicial"
              forceUppercase
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("orden_compra.referencia");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("orden_compra.referencia");
              }}
              error={getError("orden_compra.referencia")}
            />
          )}
        </form.Field>

        {/* ── Observaciones ────────────────────────────────────────────── */}
        <form.Field name="orden_compra.observaciones">
          {(field) => (
            <FormInput
              label="Observaciones"
              forceUppercase
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("orden_compra.observaciones");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("orden_compra.observaciones");
              }}
              error={getError("orden_compra.observaciones")}
            />
          )}
        </form.Field>

        {/* ── Pedidos (opcional, varios) ───────────────────────────────── */}
        <form.Field name="orden_compra.pedidos">
          {(field) => (
            <PurchaseOrderPedidosField
              value={field.state.value ?? []}
              onChange={(ids) => {
                field.handleChange(ids);
                clearFieldErrors("orden_compra.pedidos");
              }}
              error={getError("orden_compra.pedidos")}
            />
          )}
        </form.Field>
      </fieldset>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <FormSubmitButton isPending={isPending}>
          Guardar encabezado
        </FormSubmitButton>
      </div>
    </form>
  );
}
