"use client";

import {
  FormCancelButton,
  FormSubmitButton,
} from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { PackageCheckIcon } from "@/src/components/Icons";
import { useReceiptForm } from "../hooks/useReceiptForm";
import { SERIES_SUCURSAL_EMPTY_MESSAGE } from "../schemas/receipt.schema";
import { motivoSinTope, sumarCantidades } from "../utils/receiptQuantities";
import { ReceiptLinesPanel } from "./ReceiptLinesPanel";
import type { ReceiptScanLine } from "../utils/receiptScan";
import type {
  ReceiptOrderCandidate,
  ReceiptOnboardingOrderDetalleBase,
  ReceiptOnboardingSalidaMaquila,
} from "../interfaces/receipt-onboarding.interface";
import {
  candidateDetalle,
  candidateLineFueraDeSm,
  candidateLinePendiente,
  candidateLineTopes,
  salidaMaquilaDesenlace,
  salidaMaquilaOrigenNombre,
} from "../utils/receiptCandidates";
import { useOpParaSalidaMaquila } from "@/src/features/maquila-outputs/hooks/useOpParaSalidaMaquila";
import { describeRenglon } from "@/src/features/maquila-outputs/utils/salidaMaquilaDraft";

interface ReceiptFormProps {
  onSuccess: () => void;
  /** 400 en `salida_maquila`: la SM dejó de ser recibible (EC-912). */
  onSalidaMaquilaRejected?: () => void;
  /** Candidato rearmado tras un 400 por renglón; `null` si ya no se puede recibir (EC-919). */
  onCandidateRefreshed?: (candidate: ReceiptOrderCandidate | null) => void;
  candidate: ReceiptOrderCandidate;
}

/** "2026-OB-00033 — SM-00006 · Bordado · Maquilero". */
const salidaMaquilaSubtitle = (sm: ReceiptOnboardingSalidaMaquila): string =>
  `${sm.origen_folio} — ${sm.folio} · ${salidaMaquilaOrigenNombre(sm)} · ${sm.centro_confeccion_nombre}`;

/** Subtítulo de "Datos de Recepción": la orden, o la SM que se recibe. */
const receiptFormSubtitle = (candidate: ReceiptOrderCandidate): string => {
  switch (candidate.type) {
    case "compra":
      return `Orden: ${candidate.order.folio ?? "Sin folio"} — ${candidate.order.proveedor_nombre}`;
    case "produccion":
      return candidate.salidaMaquila
        ? salidaMaquilaSubtitle(candidate.salidaMaquila)
        : `Orden: ${candidate.order.folio}`;
    case "salida-maquila":
      return salidaMaquilaSubtitle(candidate.salidaMaquila);
  }
};

export default function ReceiptForm({
  onSuccess,
  onSalidaMaquilaRejected,
  onCandidateRefreshed,
  candidate,
}: ReceiptFormProps) {
  const {
    form,
    formRef,
    cantidadesRef,
    formKey,
    isPending,
    warehouses,
    seriesDisponibles,
    conRenglones,
    getError,
    lineErrors,
    clearFieldErrors,
    validateField,
    handleCantidadChange,
    handleReset,
    handleFormSubmit,
  } = useReceiptForm({ onSuccess, candidate, onSalidaMaquilaRejected, onCandidateRefreshed });

  // Forma base del detalle (OC/OP, o la SM de OB/OR normalizada).
  const detalle: ReceiptOnboardingOrderDetalleBase[] = candidateDetalle(candidate);
  // Talla y color de los renglones de una SM de OB/OR.
  const atributosSm = new Map(
    candidate.type === "salida-maquila"
      ? (candidate.salidaMaquila.detalle ?? []).map((r) => [
          r.id,
          {
            color: r.color,
            talla: r.talla,
            codigo: r.producto_codigo?.trim() || null,
            proscai: r.producto_cod_proscai?.trim() || null,
          },
        ])
      : [],
  );
  // SM que se cierra con esta recepción (de OP, o de OB/OR).
  const salidaMaquila = candidate.type === "compra" ? null : candidate.salidaMaquila;
  // Compras añade la variante del renglón, cuyo color y talla distinguen dos
  // tallas del mismo producto (EC-684): renglón de OC por id.
  const renglonesCompra = new Map(
    candidate.type === "compra" ? candidate.order.detalle.map((d) => [d.id, d]) : [],
  );
  // Techo por renglón: lo pendiente EXACTO (EC-900), que mandan "Todo" y
  // "Recibir todo"; la captura manual lo topa en enteros
  // (`capturaManualRecepcion`). Del MISMO dato salen la etiqueta de los
  // renglones no recibibles y el aviso de "nada por recibir", así que el tope
  // y el aviso no pueden contradecirse.
  // Pendiente que aplica a ESTA recepción (SM de OP, OP directa o SM de
  // OB/OR): ver `candidateLinePendiente` (EC-919).
  const pendienteDe = (d: ReceiptOnboardingOrderDetalleBase) => candidateLinePendiente(candidate, d);
  const fueraDeSm = (d: ReceiptOnboardingOrderDetalleBase) => candidateLineFueraDeSm(candidate, d);
  const topes = candidateLineTopes(candidate);
  // Las OP de fabricación especial llegan sin `producto_nombre`: el SKU sale
  // del retrieve de la OP (mismo id de renglón).
  const opId = candidate.type === "produccion" ? candidate.order.id : 0;
  const { data: opRetrieve } = useOpParaSalidaMaquila(
    opId,
    opId > 0 && detalle.some((d) => !d.producto_nombre),
  );
  const nombresOp = new Map(
    (opRetrieve?.orden_produccion_detalle ?? []).map((r) => [r.op_detalle_id, describeRenglon(r)]),
  );
  const nombreDe = (d: ReceiptOnboardingOrderDetalleBase) =>
    d.producto_nombre || d.descripcion || nombresOp.get(d.id) || d.sku || `Renglón ${d.id}`;
  // Un pendiente menor a una pieza (0.5) también se recibe, con "Todo" (EC-900).
  const recibibles = detalle.filter((d) => (topes.get(d.id) ?? 0) > 0);
  const noRecibibles = detalle.filter((d) => (topes.get(d.id) ?? 0) <= 0);
  const piezasPendientes = sumarCantidades(recibibles.map((d) => topes.get(d.id) ?? 0));
  // Renglones listos para el panel de captura (escáner o manual).
  const scanLines: ReceiptScanLine[] = [...recibibles, ...noRecibibles].map((d) => {
    const renglonCompra = renglonesCompra.get(d.id);
    // OP directa: si lo que queda está con un maquilero, se dice con qué SM
    // recibirlo en vez de "Sin pendiente" (EC-919).
    const enMaquila = salidaMaquila ? 0 : Number(d.cantidad_en_maquila) || 0;
    const enMaquilaFolios = salidaMaquila ? [] : (d.salidas_maquila ?? []).map((sm) => sm.folio);
    const motivo = fueraDeSm(d) ? "No va en esta SM" : motivoSinTope(pendienteDe(d));
    const sinTope =
      motivo === "Sin pendiente" && enMaquila > 0
        ? `En maquila ${enMaquila.toLocaleString("es-MX")}${enMaquilaFolios.length > 0 ? ` · ${enMaquilaFolios.join(", ")}` : ""}`
        : motivo;
    return {
      id: d.id,
      nombre: nombreDe(d),
      color: renglonCompra?.producto_variante_color ?? atributosSm.get(d.id)?.color ?? null,
      talla: renglonCompra?.producto_variante_talla ?? atributosSm.get(d.id)?.talla ?? null,
      sku: renglonCompra?.producto_variante_sku ?? d.sku ?? null,
      codigo: d.producto_codigo?.trim() || atributosSm.get(d.id)?.codigo || null,
      proscai: d.producto_cod_proscai?.trim() || atributosSm.get(d.id)?.proscai || null,
      ordenado: Number(d.cantidad_ordenada) || 0,
      pendiente: Number(pendienteDe(d)) || 0,
      // Solo en la OP directa: ahí esas piezas no se pueden recibir (va su SM).
      enMaquila,
      enMaquilaFolios,
      tope: sinTope ? 0 : (topes.get(d.id) ?? 0),
      sinTope,
    };
  });
  const ningunoRecibible =
    detalle.length > 0 && detalle.every((d) => (topes.get(d.id) ?? 0) <= 0);
  // Aviso en lugar de la captura: orden sin renglones, o con renglones pero
  // ninguno con algo pendiente.
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
  const headerSubtitle = receiptFormSubtitle(candidate);

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
                    {seriesDisponibles.length > 0 ? (
                      <SegmentedControl
                        options={seriesDisponibles.map((codigo) => ({ value: codigo, label: codigo }))}
                        value={field.state.value}
                        onChange={(opt) => {
                          const next = field.state.value === opt ? "" : opt;
                          field.handleChange(next);
                          clearFieldErrors("serie_codigo");
                          field.handleBlur();
                          validateField("serie_codigo", next);
                        }}
                      />
                    ) : (
                      // Sin series en la sucursal de la orden no se ofrece
                      // ninguna "por si acaso" (EC-922): el backend foliaría
                      // con otra en silencio o rechazaría el alta.
                      <p
                        role="alert"
                        className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300"
                      >
                        {SERIES_SUCURSAL_EMPTY_MESSAGE} Configúralas en Configuración → Series y Folios
                        para poder registrar la recepción.
                      </p>
                    )}
                    {seriesDisponibles.length > 0 && getError("serie_codigo") && (
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
        {candidate.type === "salida-maquila" && !conRenglones && (
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
            className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden mb-8"
          >
            <form.Subscribe selector={(state) => state.values.cantidades}>
              {(cantidades) => (
                <ReceiptLinesPanel
                  lines={scanLines}
                  cantidades={cantidades}
                  setCantidad={handleCantidadChange}
                  lineErrors={lineErrors}
                  notice={
                    (candidate.type === "salida-maquila" || cantidadesErrorAlert) && (
                      <>
                        {/* SM de OB/OR: cuenta lo que regresó, sin inventario (EC-912). */}
                        {candidate.type === "salida-maquila" && (
                          <p role="note" className="text-xs text-slate-500 dark:text-slate-400">
                            Cuenta lo que regresó del maquilero. No entra al inventario.
                          </p>
                        )}
                        {cantidadesErrorAlert}
                      </>
                    )
                  }
                />
              )}
            </form.Subscribe>
          </section>
        )}

        {/* ── SM: cuánto regresa y si se cierra con faltante (#1269) ─── */}
        {salidaMaquila && conRenglones && recibibles.length > 0 && (
          <form.Subscribe
            selector={(state) => ({
              cantidades: state.values.cantidades,
              cerrar: state.values.cerrar_salida_maquila ?? false,
            })}
          >
            {({ cantidades, cerrar }) => {
              const capturadas = sumarCantidades(
                recibibles.map((d) => Math.min(Number(cantidades[String(d.id)]) || 0, topes.get(d.id) ?? 0)),
              );
              const faltan = sumarCantidades([piezasPendientes, -capturadas]);
              const desenlace = salidaMaquilaDesenlace({ capturadas, pendientes: piezasPendientes, cerrar });
              return (
                <section
                  className={`rounded-3xl border px-6 py-4 mb-8 ${
                    faltan > 0 && capturadas > 0
                      ? "border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5"
                      : "border-slate-200 dark:border-white/5 bg-white dark:bg-zinc-900"
                  }`}
                >
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    Regresan <b className="tabular-nums">{capturadas}</b> de{" "}
                    <b className="tabular-nums">{piezasPendientes}</b> piezas de la {salidaMaquila.folio}.
                    {desenlace === "sigue-enviada" && (
                      <> Faltan <b className="tabular-nums text-amber-700 dark:text-amber-300">{faltan}</b>: la SM sigue Enviada para recibirlas después.</>
                    )}
                    {/* Con "Cerrar la SM con faltante" el backend la deja Recibida (EC-919). */}
                    {desenlace === "recibida-con-faltante" && (
                      <> Faltan <b className="tabular-nums text-amber-700 dark:text-amber-300">{faltan}</b>: la SM queda <b className="text-emerald-700 dark:text-emerald-300">Recibida</b> y esas piezas quedan como faltante del maquilero.</>
                    )}
                    {desenlace === "recibida" && (
                      <> Regresó todo: la SM queda <b className="text-emerald-700 dark:text-emerald-300">Recibida</b>.</>
                    )}
                  </p>
                  {capturadas > 0 && faltan > 0 && (
                    <form.Field name="cerrar_salida_maquila">
                      {(field) => (
                        <label className="mt-3 flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.state.value ?? false}
                            onChange={(e) => field.handleChange(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-amber-600 cursor-pointer"
                          />
                          <span>
                            <b>Cerrar la SM con faltante</b>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              Las {faltan} piezas que no regresaron quedan como faltantes del maquilero y ya no se esperan.
                            </span>
                          </span>
                        </label>
                      )}
                    </form.Field>
                  )}
                </section>
              );
            }}
          </form.Subscribe>
        )}

        {/* ── Botones ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 pb-8 mt-8 sm:flex-row sm:items-center sm:justify-end">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            disabled={seriesDisponibles.length === 0}
            loadingLabel="Registrando..."
          >
            Registrar Recepción
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
