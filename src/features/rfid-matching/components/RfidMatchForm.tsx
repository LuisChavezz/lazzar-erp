"use client";

import { useState } from "react";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { QrCodeIcon, InfoIcon, RecepcionesIcon } from "@/src/components/Icons";
import {
  MOCK_ALMACENES,
  MOCK_ORDENES_COMPRA,
  MOCK_SERIES,
  findOrdenCompra,
} from "../constants/rfidMatchCatalogs";
import { useRfidMatchForm } from "../hooks/useRfidMatchForm";

const ORDEN_COMPRA_OPTIONS = MOCK_ORDENES_COMPRA.map((orden) => ({
  value: orden.id,
  label: `${orden.id} · ${orden.proveedor} · ${orden.sucursal}`,
}));

const ALMACEN_OPTIONS = MOCK_ALMACENES.map((almacen) => ({
  value: almacen.id,
  label: `${almacen.id} · ${almacen.nombre}`,
}));

/**
 * Resumen de lo que se va a contar, en cuanto hay una OC elegida: es el dato
 * que decide si el encuadre es de 10 piezas o de 60, y verlo ANTES de crearlo
 * evita abrir el detalle solo para descubrir contra qué se está escaneando.
 */
function OrdenCompraPreview({ folio }: { folio: string }) {
  const orden = findOrdenCompra(folio);
  if (!orden) return null;

  const totalEsperado = orden.lineas.reduce((total, linea) => total + linea.esperado, 0);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Detalle esperado
        </span>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono">
          {totalEsperado} pzas
        </span>
      </div>
      <ul className="space-y-1">
        {orden.lineas.map((linea) => (
          <li
            key={linea.id}
            className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300"
          >
            <span className="truncate">
              {linea.producto}{" "}
              <span className="font-mono text-slate-400 dark:text-slate-500">
                {linea.codigo}
              </span>
            </span>
            <span className="font-mono font-semibold shrink-0">{linea.esperado}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Cuerpo del formulario — montado solo mientras el diálogo está abierto. */
function RfidMatchFormContent({ onClose }: { onClose: () => void }) {
  const { form, getError, clearError, handleFormSubmit, handleReset } = useRfidMatchForm({
    onSuccess: onClose,
  });

  return (
    <form onSubmit={handleFormSubmit} className="w-full space-y-5">
      <section className="space-y-4">
        <form.Field name="orden_compra">
          {(field) => (
            <>
              <FormSelect
                label="Orden de compra"
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearError("orden_compra");
                }}
                onBlur={field.handleBlur}
                error={getError("orden_compra")}
              >
                <option value="" disabled>
                  Selecciona una orden
                </option>
                {ORDEN_COMPRA_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  >
                    {option.label}
                  </option>
                ))}
              </FormSelect>
              {field.state.value !== "" && (
                <div className="mt-3">
                  <OrdenCompraPreview folio={field.state.value} />
                </div>
              )}
            </>
          )}
        </form.Field>

        <form.Field name="almacen_id">
          {(field) => (
            <FormSelect
              label="Almacén"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearError("almacen_id");
              }}
              onBlur={field.handleBlur}
              error={getError("almacen_id")}
            >
              <option value="" disabled>
                Selecciona un almacén
              </option>
              {ALMACEN_OPTIONS.map((option) => (
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form.Field name="serie">
            {(field) => (
              <FormSelect
                label="Serie"
                name={field.name}
                value={field.state.value}
                options={MOCK_SERIES}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearError("serie");
                }}
                onBlur={field.handleBlur}
                error={getError("serie")}
              />
            )}
          </form.Field>

          <form.Field name="remision">
            {(field) => (
              <FormInput
                label="Remisión"
                placeholder="REM-0000"
                // Mismo criterio que el resto de altas del proyecto: los campos
                // de texto libre de captura se normalizan a mayúsculas.
                forceUppercase
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearError("remision");
                }}
                onBlur={field.handleBlur}
                error={getError("remision")}
              />
            )}
          </form.Field>
        </div>

        <form.Field name="factura_referencia">
          {(field) => (
            <FormInput
              label="Factura referencia"
              placeholder="A-00000"
              forceUppercase
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearError("factura_referencia");
              }}
              onBlur={field.handleBlur}
              error={getError("factura_referencia")}
            />
          )}
        </form.Field>

        <form.Field name="observaciones">
          {(field) => (
            <FormTextarea
              label="Observaciones"
              placeholder="Notas de la recepción (opcional)"
              rows={3}
              name={field.name}
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
      </section>

      <p className="flex items-start gap-2 text-[11px] text-slate-400 dark:text-slate-500">
        <InfoIcon className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
        El encuadre nace sin lecturas y no mueve inventario: solo compara lo esperado de la
        orden contra lo que se lea con el Zebra.
      </p>

      <div className="flex items-center justify-end gap-3 pt-1">
        <FormCancelButton onClick={handleReset} />
        {/* Sin `isPending`: el alta es síncrona sobre el estado en memoria
            (ver `useCreateRfidMatch`), no hay envío que esperar. */}
        <FormSubmitButton>
          <span className="inline-flex items-center gap-2">
            <RecepcionesIcon className="w-4 h-4" aria-hidden="true" />
            Crear encuadre
          </span>
        </FormSubmitButton>
      </div>
    </form>
  );
}

/**
 * Punto de entrada del alta: botón del toolbar que abre el diálogo. El cuerpo
 * solo se monta con el diálogo abierto y se re-monta limpio en cada apertura
 * (sin valores residuales de un intento anterior), igual que `PickingForm`.
 */
export function RfidMatchForm() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <MainDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      title={
        <DialogHeader
          title="Nuevo Encuadre"
          subtitle="Conteo de recepción contra una orden de compra"
          statusColor="indigo"
        />
      }
      maxWidth="640px"
      showCloseButton={false}
      trigger={
        <Button variant="primary">
          <QrCodeIcon className="w-4 h-4" />
          Nuevo encuadre
        </Button>
      }
    >
      {isDialogOpen && <RfidMatchFormContent onClose={() => setIsDialogOpen(false)} />}
    </MainDialog>
  );
}
