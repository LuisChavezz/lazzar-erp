"use client";

import { useState, type FormEvent } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { QuantitySelector } from "@/src/components/QuantitySelector";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import { capturaManualRecepcion } from "@/src/features/receipts/utils/receiptQuantities";
import { Loader } from "@/src/components/Loader";
import { ErrorState } from "@/src/components/ErrorState";
import { EmptyLines, LineItemsTable, textOrDash } from "@/src/components/DetailDialogPrimitives";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatLocalDate } from "@/src/utils/formatDate";
import { CancelReasonFormSchema } from "@/src/features/document-cancellation/schemas/cancel-reason.schema";
import { useSupplierReturnPendientes } from "../hooks/useSupplierReturnPendientes";
import { useReturnableInspections } from "../hooks/useReturnableInspections";
import {
  createSupplierReturnMutationKey,
  useCreateSupplierReturn,
  type SupplierReturnFormField,
} from "../hooks/useCreateSupplierReturn";
import type { SupplierReturn, SupplierReturnPendingLine } from "../interfaces/supplier-return.interface";
import {
  buildSupplierReturnDetalles,
  pendingQuantity,
  reconcileReturnQuantities,
} from "../utils/supplierReturnPayload";

/** La inspección de la que se devuelve, ya elegida por quien abre el diálogo. */
export interface SupplierReturnInspectionTarget {
  id: number;
  recepcion_folio: string;
}

interface SupplierReturnCreateDialogProps {
  open: boolean;
  /**
   * Con una inspección, el diálogo la trae ya elegida ("Devolver a proveedor"
   * desde Calidad). Con `null`, ofrece el selector de inspecciones con algo por
   * devolver ("Nueva devolución").
   */
  inspection: SupplierReturnInspectionTarget | null;
  onClose: () => void;
  onCreated?: (dev: SupplierReturn) => void;
}

/** Cómo se nombra una inspección en el selector: folio de la recepción y fecha. */
const inspectionLabel = (inspection: { recepcion_folio: string; fecha: string }) =>
  `${inspection.recepcion_folio} · inspeccionada ${formatLocalDate(inspection.fecha)}`;

const RESULTADO_LABEL: Record<string, string> = { rechazo: "Rechazo", cuarentena: "Cuarentena" };

/**
 * Alta de una devolución a proveedor (EC-951). Sus dos entradas abren este mismo
 * diálogo: "Devolver a proveedor" en Calidad (la inspección ya elegida) y
 * "Nueva devolución" en la pantalla de devoluciones (selector con
 * `?devolucion_pendiente=true`).
 *
 * Lista los renglones de `pendientes/` con producto, SKU, talla y color. Las
 * cantidades siguen la convención de recepciones (EC-900/EC-924): captura en
 * piezas enteras (`QuantitySelector`, topada en lo pendiente) y "Todo" /
 * "Devolver todo" fijan el pendiente EXACTO, la única forma de devolver uno
 * fraccionario. Al releer lo pendiente lo capturado se conserva, recortado. El
 * motivo es obligatorio. Se manda solo lo capturado (`buildSupplierReturnDetalles`).
 *
 * Errores: `motivo` bajo el campo, `detalles` sobre la tabla y
 * `calidad_inspeccion` bajo el selector (o sobre la tabla si venía elegida); en
 * los dos últimos lo pendiente se relee. El diálogo no se cierra a media
 * petición.
 */
export function SupplierReturnCreateDialog({ open, inspection, onClose, onCreated }: SupplierReturnCreateDialogProps) {
  const session = useDialogSession(open, { inspection });
  // No se cierra a media petición; de la MutationCache, no del formulario.
  const isPending = useIsMutating({ mutationKey: createSupplierReturnMutationKey }) > 0;
  return (
    <MainDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isPending) onClose();
      }}
      maxWidth="860px"
      showCloseButton={false}
      title="Devolver a proveedor"
      description={
        session.snapshot?.inspection
          ? `Lo rechazado o en cuarentena de la inspección de ${session.snapshot.inspection.recepcion_folio} que aún no se devuelve. El inventario no cambia: lo rechazado nunca entró a existencias.`
          : "Elige la inspección de calidad con lo rechazado o en cuarentena que se devuelve. El inventario no cambia: lo rechazado nunca entró a existencias."
      }
    >
      {session.snapshot && (
        <SupplierReturnCreateForm
          key={session.id}
          presetInspection={session.snapshot.inspection}
          onClose={onClose}
          onCreated={(dev) => {
            onCreated?.(dev);
            onClose();
          }}
        />
      )}
    </MainDialog>
  );
}

interface SupplierReturnCreateFormProps {
  presetInspection: SupplierReturnInspectionTarget | null;
  onClose: () => void;
  onCreated: (dev: SupplierReturn) => void;
}

/** Contenido del diálogo; se monta de nuevo en cada apertura (`key`). */
function SupplierReturnCreateForm({ presetInspection, onClose, onCreated }: SupplierReturnCreateFormProps) {
  const [inspectionId, setInspectionId] = useState<number | null>(presetInspection?.id ?? null);
  // Etiqueta de la inspección elegida: si otra sesión devuelve lo último que
  // tenía, sale del selector al releerse y aun así debe seguir visible.
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  // Cantidades por `calidad_detalle`; `null` = aún no se lee lo pendiente.
  const [quantities, setQuantities] = useState<Record<number, string> | null>(null);
  const [seededFor, setSeededFor] = useState<SupplierReturnPendingLine[] | undefined>(undefined);

  const returnable = useReturnableInspections(presetInspection === null);
  const pendientes = useSupplierReturnPendientes(inspectionId);
  const lines = pendientes.lines;

  // Al leer (o releer) lo pendiente, lo capturado se conserva recortado al
  // pendiente nuevo y solo los renglones nuevos arrancan vacíos
  // (`reconcileReturnQuantities`). Ajuste de estado durante el render, sin
  // efecto: solo cuando cambia el arreglo leído.
  if (lines !== seededFor) {
    setSeededFor(lines);
    if (lines) setQuantities((current) => reconcileReturnQuantities(current ?? {}, lines));
  }

  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    clearServerErrors,
  } = useFormFieldErrors<SupplierReturnFormField>();

  const create = useCreateSupplierReturn({
    onFieldError: setServerFieldError,
    onSuccess: onCreated,
  });
  const isPending = create.isPending;

  const form = useForm({
    defaultValues: { motivo: "" },
    onSubmit: ({ value }) => {
      clearServerErrors();
      let invalid = false;
      if (inspectionId === null) {
        setClientFieldError("calidad_inspeccion", "Elige la inspección de calidad.");
        invalid = true;
      }
      const detalles = lines && quantities ? buildSupplierReturnDetalles(lines, quantities) : [];
      if (inspectionId !== null && detalles.length === 0) {
        setClientFieldError("detalles", "Captura la cantidad a devolver en al menos un renglón.");
        invalid = true;
      } else {
        clearClientFieldError("detalles");
      }
      const parsed = CancelReasonFormSchema.safeParse(value);
      if (!parsed.success) {
        setClientFieldError("motivo", parsed.error.issues[0]?.message ?? "Motivo inválido");
        invalid = true;
      } else {
        clearClientFieldError("motivo");
      }
      if (invalid || inspectionId === null || !parsed.success) return;
      create.mutate({ calidad_inspeccion: inspectionId, motivo: parsed.data.motivo, detalles });
    },
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isPending) return;
    void form.handleSubmit();
  };

  const inspectionOptions = returnable.inspections.map((i) => ({
    value: i.id,
    label: inspectionLabel(i),
  }));
  if (inspectionId !== null && !inspectionOptions.some((o) => o.value === inspectionId)) {
    inspectionOptions.unshift({
      value: inspectionId,
      label: `${selectedLabel ?? `Inspección #${inspectionId}`} (sin pendientes)`,
    });
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4 py-1">
      {presetInspection === null && (
        <div>
          {returnable.isInitialError ? (
            <RetryableError
              title="No se pudieron cargar las inspecciones"
              message={extractErrorMessage(returnable.error, "Intenta de nuevo.")}
              onRetry={() => void returnable.refetch()}
            />
          ) : (
            <FormSelect
              label="Inspección de calidad"
              name="calidad_inspeccion"
              value={inspectionId ?? ""}
              disabled={isPending || returnable.isLoading}
              error={getError("calidad_inspeccion")}
              onChange={(event) => {
                const next = Number(event.target.value);
                const id = Number.isInteger(next) && next > 0 ? next : null;
                setInspectionId(id);
                // La etiqueta BASE de la inspección (folio y fecha), no el texto
                // de la opción: el de respaldo ya trae "(sin pendientes)".
                const found = returnable.inspections.find((i) => i.id === id);
                if (id === null) setSelectedLabel(null);
                else if (found) setSelectedLabel(inspectionLabel(found));
                clearFieldErrors("calidad_inspeccion");
                clearFieldErrors("detalles");
              }}
            >
              <option value="">
                {returnable.isLoading
                  ? "Cargando inspecciones…"
                  : inspectionOptions.length === 0
                    ? "No hay inspecciones con algo por devolver"
                    : "Selecciona una inspección"}
              </option>
              {inspectionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelect>
          )}
        </div>
      )}

      {presetInspection !== null && getError("calidad_inspeccion") && (
        <FieldNotice message={getError("calidad_inspeccion")?.message} />
      )}

      {inspectionId !== null && (
        <PendingLinesSection
          lines={lines}
          isLoading={pendientes.isLoading}
          isError={pendientes.isInitialError}
          error={pendientes.error}
          onRetry={() => void pendientes.refetch()}
          quantities={quantities ?? {}}
          disabled={isPending}
          detallesError={getError("detalles")?.message}
          onQuantityChange={(id, value) => {
            setQuantities((current) => ({ ...(current ?? {}), [id]: value }));
            clearFieldErrors("detalles");
          }}
        />
      )}

      <form.Field name="motivo">
        {(field) => (
          <FormTextarea
            label="Motivo de la devolución"
            name={field.name}
            rows={3}
            placeholder="Explica por qué se devuelve al proveedor"
            value={field.state.value}
            disabled={isPending}
            error={getError("motivo")}
            onChange={(event) => {
              field.handleChange(event.target.value);
              clearFieldErrors("motivo");
            }}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>

      <div className="flex justify-end gap-3 pt-1">
        <FormCancelButton label="Volver" onClick={onClose} disabled={isPending} />
        <FormSubmitButton isPending={isPending} loadingLabel="Registrando…">
          Registrar devolución
        </FormSubmitButton>
      </div>
    </form>
  );
}

function RetryableError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <div className="space-y-2">
      <ErrorState title={title} message={message} />
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={onRetry} className="px-3! py-1.5! text-xs!">
          Reintentar
        </Button>
      </div>
    </div>
  );
}

function FieldNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
    >
      {message}
    </p>
  );
}

interface PendingLinesSectionProps {
  lines: SupplierReturnPendingLine[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  quantities: Record<number, string>;
  disabled: boolean;
  detallesError?: string;
  onQuantityChange: (calidadDetalle: number, value: string) => void;
}

function PendingLinesSection({
  lines,
  isLoading,
  isError,
  error,
  onRetry,
  quantities,
  disabled,
  detallesError,
  onQuantityChange,
}: PendingLinesSectionProps) {
  if (isLoading) return <Loader title="Cargando lo pendiente de devolver..." className="py-8" />;
  if (isError) {
    return (
      <RetryableError
        title="No se pudo cargar lo pendiente de devolver"
        message={extractErrorMessage(error, "Intenta de nuevo.")}
        onRetry={onRetry}
      />
    );
  }
  return (
    <div className="space-y-2">
      <FieldNotice message={detallesError} />
      {lines && lines.length > 0 && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => lines.forEach((line) => onQuantityChange(line.calidad_detalle, line.cantidad_pendiente))}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Devolver todo
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => lines.forEach((line) => onQuantityChange(line.calidad_detalle, ""))}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Nada
          </button>
        </div>
      )}
      {!lines || lines.length === 0 ? (
        <EmptyLines>Esta inspección ya no tiene nada rechazado ni en cuarentena por devolver.</EmptyLines>
      ) : (
        <LineItemsTable
          head={
            <>
              <th className="px-3 py-2 font-medium">Producto</th>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Talla</th>
              <th className="px-3 py-2 font-medium">Color</th>
              <th className="px-3 py-2 font-medium">Resultado</th>
              <th className="px-3 py-2 font-medium text-right">Pendiente</th>
              <th className="px-3 py-2 font-medium text-right">A devolver</th>
            </>
          }
        >
          {lines.map((line) => {
            const name = line.producto_nombre?.trim() || `Renglón ${line.calidad_detalle}`;
            const pending = pendingQuantity(line);
            const qty = Math.min(Number(quantities[line.calidad_detalle]) || 0, pending);
            return (
              <tr key={line.calidad_detalle}>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{name}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                  {textOrDash(line.producto_variante_sku)}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{textOrDash(line.producto_variante_talla)}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{textOrDash(line.producto_variante_color)}</td>
                <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                  {RESULTADO_LABEL[line.resultado] ?? line.resultado}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-white">
                  {formatExactQuantityValue(line.cantidad_pendiente)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    {qty < pending && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onQuantityChange(line.calidad_detalle, line.cantidad_pendiente)}
                        className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Todo ({formatExactQuantityValue(line.cantidad_pendiente)})
                      </button>
                    )}
                    <QuantitySelector
                      value={qty}
                      // Enteros, topados en el pendiente; si "Todo" dejó el pendiente
                      // fraccionario, un "+" no lo baja (teclear sí). Regla de recepciones.
                      onChange={(next, origin) =>
                        onQuantityChange(
                          line.calidad_detalle,
                          String(capturaManualRecepcion(next, qty, pending, origin === "input")),
                        )
                      }
                      min={0}
                      label={`Cantidad a devolver de ${name}`}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </LineItemsTable>
      )}
    </div>
  );
}
