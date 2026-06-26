"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormSubmitButton } from "@/src/components/FormButtons";
import type { PurchaseOrderOnboardingData } from "../interfaces/purchase-order-onboarding.interface";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import type { PurchaseOrderEditFormValues } from "../schemas/purchase-order-edit.schema";
import { usePurchaseOrderEditForm } from "../hooks/usePurchaseOrderEditForm";

interface PurchaseOrderEditStep1Props {
  /** Orden existente que se edita (pre-puebla el formulario). */
  initialData: PurchaseOrder;
  /** Encabezado capturado previamente; preserva la edición al volver desde la revisión. */
  initialHeader?: PurchaseOrderEditFormValues;
  /** Datos de onboarding (catálogos) ya cargados por el step manager. */
  onboardingData: PurchaseOrderOnboardingData;
  /** Llamado con el encabezado validado al continuar al paso de productos. */
  onSuccess: (header: PurchaseOrderEditFormValues) => void;
}

/**
 * Step 1 del flujo de edición: edición del encabezado de la orden.
 *
 * Reutiliza las mismas primitivas de formulario que el Step 1 de creación,
 * pero con campos planos pre-poblados desde la orden. No realiza ninguna
 * llamada al API: al validar, pasa el encabezado al step manager.
 */
export function PurchaseOrderEditStep1({
  initialData,
  initialHeader,
  onboardingData,
  onSuccess,
}: PurchaseOrderEditStep1Props) {
  const {
    form,
    handleFormSubmit,
    sucursalOptions,
    proveedorOptions,
    monedaOptions,
    getError,
    clearFieldErrors,
    validateField,
    coerceNumeric,
  } = usePurchaseOrderEditForm({
    initialData,
    initialHeader,
    onboardingData,
    onSuccess,
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <fieldset className="space-y-6">
        {/* ── Sucursal ─────────────────────────────────────────────────── */}
        <form.Field name="sucursal">
          {(field) => (
            <FormSelect
              label="Sucursal"
              name={field.name}
              value={field.state.value}
              options={sucursalOptions}
              onChange={(event) => {
                const nextValue = coerceNumeric(
                  "sucursal",
                  event.target.value,
                ) as number;
                field.handleChange(nextValue);
                clearFieldErrors("sucursal");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("sucursal");
              }}
              error={getError("sucursal")}
            />
          )}
        </form.Field>

        {/* ── Proveedor ────────────────────────────────────────────────── */}
        <form.Field name="proveedor">
          {(field) => (
            <FormSelect
              label="Proveedor"
              name={field.name}
              value={field.state.value}
              options={proveedorOptions}
              onChange={(event) => {
                const nextValue = coerceNumeric(
                  "proveedor",
                  event.target.value,
                ) as number;
                field.handleChange(nextValue);
                clearFieldErrors("proveedor");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("proveedor");
              }}
              error={getError("proveedor")}
            />
          )}
        </form.Field>

        {/* ── Moneda ───────────────────────────────────────────────────── */}
        <form.Field name="moneda">
          {(field) => (
            <FormSelect
              label="Moneda"
              name={field.name}
              value={field.state.value}
              options={monedaOptions}
              onChange={(event) => {
                const nextValue = coerceNumeric(
                  "moneda",
                  event.target.value,
                ) as number;
                field.handleChange(nextValue);
                clearFieldErrors("moneda");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("moneda");
              }}
              error={getError("moneda")}
            />
          )}
        </form.Field>

        {/* ── Fecha OC ─────────────────────────────────────────────────── */}
        <form.Field name="fecha_oc">
          {(field) => (
            <FormInput
              label="Fecha de la orden"
              type="date"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("fecha_oc");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("fecha_oc");
              }}
              error={getError("fecha_oc")}
            />
          )}
        </form.Field>

        {/* ── Referencia ───────────────────────────────────────────────── */}
        <form.Field name="referencia">
          {(field) => (
            <FormInput
              label="Referencia"
              placeholder="Compra inicial"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("referencia");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("referencia");
              }}
              error={getError("referencia")}
            />
          )}
        </form.Field>

        {/* ── Observaciones ────────────────────────────────────────────── */}
        <form.Field name="observaciones">
          {(field) => (
            <FormInput
              label="Observaciones"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("observaciones");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("observaciones");
              }}
              error={getError("observaciones")}
            />
          )}
        </form.Field>
      </fieldset>

      {/* ── Continuar a la revisión ────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <FormSubmitButton isPending={false}>Continuar</FormSubmitButton>
      </div>
    </form>
  );
}
