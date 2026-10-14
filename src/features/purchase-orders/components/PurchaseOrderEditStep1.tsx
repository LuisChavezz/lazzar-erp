"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormSubmitButton } from "@/src/components/FormButtons";
import type { PurchaseOrderOnboardingData } from "../interfaces/purchase-order-onboarding.interface";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import type { PurchaseOrderEditHeader } from "../schemas/purchase-order-edit.schema";
import { usePurchaseOrderEditForm } from "../hooks/usePurchaseOrderEditForm";
import { formatShortDate, parseLocalDate } from "@/src/utils/formatDate";
import { TIPO_COMPRA_OPTIONS } from "../constants/purchaseOrderTipoCompra";
import type { TipoCompra } from "../interfaces/purchase-order.interface";
import type { PurchaseOrderHeaderFieldErrors } from "../utils/purchaseOrderHeaderErrors";
import { PurchaseOrderPedidosField } from "./PurchaseOrderPedidosField";

interface PurchaseOrderEditStep1Props {
  /** Orden existente que se edita, leída fresca del detalle (pre-puebla el formulario). */
  initialData: PurchaseOrder;
  /** Encabezado capturado previamente; preserva la edición al volver desde el Step 2. */
  initialHeader?: PurchaseOrderEditHeader;
  /** Datos de onboarding (catálogos) ya cargados por el step manager. */
  onboardingData: PurchaseOrderOnboardingData;
  /** Errores por campo con los que el backend rechazó el PUT (ver el step manager). */
  initialServerErrors?: PurchaseOrderHeaderFieldErrors;
  /** Llamado con el encabezado validado al continuar al paso de productos. */
  onSuccess: (header: PurchaseOrderEditHeader) => void;
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
  initialServerErrors,
  onSuccess,
}: PurchaseOrderEditStep1Props) {
  // El tipo de compra decide la serie del folio: con folio ya asignado el
  // backend rechaza cambiarlo, así que se bloquea (y el PUT lo omite).
  const isTipoCompraLocked = Boolean(initialData.folio);

  const {
    form,
    fechaGeneracion,
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
    initialServerErrors,
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

        {/* ── Tipo de compra ───────────────────────────────────────────────
            Bloqueado cuando la orden ya tiene folio (ver `isTipoCompraLocked`). */}
        <form.Field name="tipo_compra">
          {(field) => (
            <div>
              <FormSelect
                label="Tipo de compra"
                name={field.name}
                value={field.state.value}
                options={TIPO_COMPRA_OPTIONS}
                disabled={isTipoCompraLocked}
                aria-describedby={isTipoCompraLocked ? "tipo_compra-locked-hint" : undefined}
                onChange={(event) => {
                  field.handleChange(event.target.value as TipoCompra);
                  clearFieldErrors("tipo_compra");
                }}
                onBlur={() => {
                  field.handleBlur();
                  validateField("tipo_compra");
                }}
                error={getError("tipo_compra")}
              />
              {isTipoCompraLocked && (
                <p
                  id="tipo_compra-locked-hint"
                  className="ml-1 mt-1 text-xs text-slate-500 dark:text-slate-400"
                >
                  No se puede cambiar: la orden ya tiene folio y este depende del tipo de compra.
                </p>
              )}
            </div>
          )}
        </form.Field>

        {/* ── Fecha de generación (solo lectura) ─────────────────────────
            La fija el servidor al crear la orden y el PUT no la envía. */}
        <FormInput
          label="Fecha de generación"
          name="fecha_oc"
          value={formatShortDate(parseLocalDate(fechaGeneracion))}
          readOnly
          disabled
        />

        {/* ── Fecha de vencimiento (opcional) ───────────────────────────── */}
        <form.Field name="fecha_vencimiento">
          {(field) => (
            <FormInput
              label="Fecha de vencimiento"
              type="date"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("fecha_vencimiento");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("fecha_vencimiento");
              }}
              error={getError("fecha_vencimiento")}
            />
          )}
        </form.Field>

        {/* ── Referencia (opcional) ─────────────────────────────────────── */}
        <form.Field name="referencia">
          {(field) => (
            <FormInput
              label="Referencia"
              placeholder="Compra inicial"
              forceUppercase
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
              forceUppercase
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

        {/* ── Pedidos (opcional, varios) ───────────────────────────────────
            `pedidos_vinculados` da el folio de los ya ligados que no estén
            entre las opciones (cancelados o inactivos): siguen marcados. */}
        <form.Field name="pedidos">
          {(field) => (
            <PurchaseOrderPedidosField
              value={field.state.value ?? []}
              linkedPedidos={initialData.pedidos_vinculados}
              onChange={(ids) => {
                field.handleChange(ids);
                clearFieldErrors("pedidos");
              }}
              error={getError("pedidos")}
            />
          )}
        </form.Field>
      </fieldset>

      {/* ── Continuar a productos ──────────────────────────────────────── */}
      <div className="flex justify-end pt-2">
        <FormSubmitButton isPending={false}>Continuar</FormSubmitButton>
      </div>
    </form>
  );
}
