"use client";

import {
  FormCancelButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { QuantitySelector } from "@/src/components/QuantitySelector";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { PackageCheckIcon } from "@/src/components/Icons";
import { useReceiptForm } from "../hooks/useReceiptForm";
import { motivoSinTope, topeRecepcion } from "../utils/receiptQuantities";
import { variantAttributesLabel } from "@/src/features/purchase-orders/utils/purchaseOrderLines";
import { VariantAttributesCaption } from "@/src/features/purchase-orders/components/VariantAttributesCaption";
import type {
  ReceiptOrderCandidate,
  ReceiptOnboardingOrderDetalleBase,
} from "../interfaces/receipt-onboarding.interface";
import { salidaMaquilaOrigenNombre } from "../utils/receiptCandidates";

interface ReceiptFormProps {
  onSuccess: () => void;
  candidate: ReceiptOrderCandidate;
}

const SERIE_CODIGO_OPTIONS: { value: string; label: string }[] = [
  { value: "RC", label: "RC" },
  { value: "RT", label: "RT" },
  { value: "RZ", label: "RZ" },
];

export default function ReceiptForm({
  onSuccess,
  candidate,
}: ReceiptFormProps) {
  const {
    form,
    formRef,
    cantidadesRef,
    formKey,
    isPending,
    warehouses,
    conRenglones,
    getError,
    clearFieldErrors,
    validateField,
    handleCantidadChange,
    handleReset,
    handleFormSubmit,
  } = useReceiptForm({ onSuccess, candidate });

  // Ambos tipos comparten la forma base del detalle; producción sólo añade
  // `producto_variante_id` (consumido en el submit, no en el render). Normalizar
  // a la base permite iterar sin narrowing en el JSX. La SM de OB/OR no tiene
  // renglones (EC-912).
  const detalle: ReceiptOnboardingOrderDetalleBase[] =
    candidate.type === "salida-maquila" ? [] : candidate.order.detalle;
  // SM que se cierra con esta recepción (de OP, o de OB/OR).
  const salidaMaquila = candidate.type === "compra" ? null : candidate.salidaMaquila;
  // Compras añade la variante del renglón, cuyo color y talla distinguen dos
  // tallas del mismo producto (EC-684): renglón de OC por id.
  const renglonesCompra = new Map(
    candidate.type === "compra" ? candidate.order.detalle.map((d) => [d.id, d]) : [],
  );
  // Techo de captura por renglón (lo pendiente en piezas enteras). Del MISMO
  // dato salen la etiqueta de los renglones no recibibles y el aviso de "nada
  // por recibir", así que el tope y el aviso no pueden contradecirse.
  const topes = new Map(detalle.map((d) => [d.id, topeRecepcion(d.cantidad_pendiente)]));
  const ningunoRecibible =
    detalle.length > 0 && detalle.every((d) => (topes.get(d.id) ?? 0) < 1);
  // Aviso en lugar de la captura: orden sin renglones, o con renglones pero
  // ninguno con una pieza entera pendiente.
  const avisoSinPiezas = !conRenglones
    ? null
    : detalle.length === 0
      ? "La orden no tiene productos para recibir."
      : ningunoRecibible
        ? "La orden no tiene piezas pendientes por recibir"
        : null;
  // Error de "al menos una cantidad > 0" (EC-893). Si ningún renglón se puede
  // recibir, el aviso ya lo explica y el error genérico no se muestra.
  const cantidadesError = ningunoRecibible ? undefined : getError("cantidades")?.message;
  const cantidadesErrorAlert = cantidadesError ? (
    <p role="alert" className="text-xs text-red-600 mt-1 font-medium">
      {cantidadesError}
    </p>
  ) : null;
  const headerSubtitle =
    candidate.type === "compra"
      ? `Orden: ${candidate.order.folio ?? "Sin folio"} — ${candidate.order.proveedor_nombre}`
      : candidate.type === "produccion" && !candidate.salidaMaquila
        ? `Orden: ${candidate.order.folio}`
        : salidaMaquila
          ? `${salidaMaquila.origen_folio} — ${salidaMaquila.folio} · ${salidaMaquilaOrigenNombre(salidaMaquila)} · ${salidaMaquila.centro_confeccion_nombre}`
          : "";

  return (
    <form
      ref={formRef}
      key={formKey}
      onSubmit={handleFormSubmit}
      className="w-full"
    >
      <fieldset
        disabled={isPending}
        className="group-disabled:opacity-50"
      >
        {/* ── Datos de recepción ─────────────────────────────────────── */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <PackageCheckIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Datos de Recepción
              </h3>
              <p className="text-xs text-slate-500">
                {headerSubtitle}
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Almacén */}
              <form.Field name="almacen">
                {(field) => (
                  <FormSelect
                    label="Almacén"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      field.handleChange(
                        Number.isNaN(next) ? 0 : next,
                      );
                      clearFieldErrors("almacen");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("almacen", field.state.value);
                    }}
                    error={getError("almacen")}
                  >
                    <option value="0" disabled>
                      {/* El catálogo ya viene filtrado por la sucursal de la
                          orden (EC-796): vacío = la sucursal no tiene
                          almacenes activos, no que falte cargar. */}
                      {warehouses.length === 0
                        ? "No hay almacenes activos en la sucursal de la orden"
                        : "Seleccionar..."}
                    </option>
                    {warehouses.map((w) => (
                      <option
                        key={w.id_almacen}
                        value={w.id_almacen}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {w.nombre}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

              {/* Remisión */}
              <form.Field name="remision">
                {(field) => (
                  <FormInput
                    label="Remisión"
                    placeholder="Número de remisión"
                    forceUppercase
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("remision");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("remision", field.state.value);
                    }}
                    error={getError("remision")}
                  />
                )}
              </form.Field>

              {/* Factura de referencia */}
              <form.Field name="factura_referencia">
                {(field) => (
                  <FormInput
                    label="Factura de Referencia"
                    placeholder="Folio de la factura"
                    forceUppercase
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("factura_referencia");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField(
                        "factura_referencia",
                        field.state.value,
                      );
                    }}
                    error={getError("factura_referencia")}
                  />
                )}
              </form.Field>

              {/* Serie de recepción — segmented control */}
              <form.Field name="serie_codigo">
                {(field) => (
                  <div className="group/field w-full">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-brand-500">
                      Serie de Recepción
                    </label>
                    <SegmentedControl
                      options={SERIE_CODIGO_OPTIONS}
                      value={field.state.value}
                      onChange={(opt) => {
                        const next = field.state.value === opt ? "" : opt;
                        field.handleChange(next);
                        clearFieldErrors("serie_codigo");
                        field.handleBlur();
                        validateField("serie_codigo", next);
                      }}
                    />
                    {getError("serie_codigo") && (
                      <p className="text-xs text-red-600 mt-1 font-medium animate-in slide-in-from-top-1 fade-in duration-200">
                        {getError("serie_codigo")?.message}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Observaciones */}
              <div className="md:col-span-2">
                <form.Field name="observaciones">
                  {(field) => (
                    <FormTextarea
                      label="Observaciones"
                      rows={3}
                      placeholder="Notas adicionales sobre la recepción"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("observaciones");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField(
                          "observaciones",
                          field.state.value,
                        );
                      }}
                      error={getError("observaciones")}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </div>
        </section>

        {/* ── SM de OB/OR: sin renglones (EC-912) ────────────────────── */}
        {candidate.type === "salida-maquila" && (
          <section className="rounded-3xl border border-sky-200 dark:border-sky-500/20 bg-sky-50/60 dark:bg-sky-500/5 px-8 py-5 mb-8">
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Las prendas regresan de maquila sin entrar al inventario: no hay
              cantidades que capturar. Al registrar, la {candidate.salidaMaquila.folio}{" "}
              queda como Recibida.
            </p>
          </section>
        )}

        {/* ── Detalle de la orden ───────────────────────────────────── */}
        {avisoSinPiezas && (
          <section
            ref={cantidadesRef}
            className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900 px-8 py-5 mb-8"
          >
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {avisoSinPiezas}
            </p>
            {cantidadesErrorAlert}
          </section>
        )}

        {detalle.length > 0 && (
          <section
            ref={avisoSinPiezas ? undefined : cantidadesRef}
            className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8"
          >
            <div className="px-8 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                <PackageCheckIcon className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white text-base">
                  Detalle de Productos
                </h3>
                <p className="text-xs text-slate-500">
                  {detalle.length} producto{detalle.length > 1 ? "s" : ""} — Capturar cantidad recibida
                </p>
                {/* SM de OP: el backend la cierra con esta recepción aunque
                    no se reciba todo (EC-912). */}
                {salidaMaquila && (
                  <p role="note" className="text-xs text-amber-700 dark:text-amber-300 mt-1 font-medium">
                    Al registrar, la {salidaMaquila.folio} queda como Recibida aunque la recepción sea parcial.
                  </p>
                )}
                {cantidadesErrorAlert}
              </div>
            </div>

            <div className="p-4">
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {detalle.map((d) => {
                  const fieldName = `cantidades.${d.id}` as const;
                  const renglonCompra = renglonesCompra.get(d.id);
                  const tope = topes.get(d.id) ?? 0;
                  const sinTope = motivoSinTope(d.cantidad_pendiente);
                  const atributos = variantAttributesLabel(
                    renglonCompra?.producto_variante_color,
                    renglonCompra?.producto_variante_talla,
                  );
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-4 py-3 px-2"
                    >
                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {d.producto_nombre}
                        </p>
                        <VariantAttributesCaption
                          color={renglonCompra?.producto_variante_color}
                          talla={renglonCompra?.producto_variante_talla}
                        />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Ordenado: {Number(d.cantidad_ordenada).toFixed(0)} &middot; Pendiente: {Number(d.cantidad_pendiente).toFixed(0)}
                        </p>
                      </div>

                      {/* Cantidad recibida: sin una pieza entera pendiente no
                          hay captura, solo el motivo (decimales: EC-900). */}
                      {sinTope ? (
                        <span className="shrink-0 rounded-md bg-slate-100 dark:bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {sinTope}
                        </span>
                      ) : (
                        <form.Field name={fieldName}>
                          {(field) => (
                            <QuantitySelector
                              value={Number(field.state.value) || 0}
                              // `QuantitySelector` no tiene techo: se topa aquí,
                              // así que nunca se captura más que lo pendiente.
                              onChange={(next) =>
                                handleCantidadChange(d.id, String(Math.min(next, tope)))
                              }
                              min={0}
                              label={`Cantidad de ${d.producto_nombre}${atributos ? ` (${atributos})` : ""}`}
                            />
                          )}
                        </form.Field>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Botones ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 pb-8 mt-8 sm:flex-row sm:items-center sm:justify-end">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel="Registrando..."
          >
            Registrar Recepción
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
