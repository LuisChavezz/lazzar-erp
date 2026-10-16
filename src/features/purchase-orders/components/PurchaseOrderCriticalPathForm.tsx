"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { usePurchaseOrderCriticalPathForm } from "../hooks/usePurchaseOrderCriticalPathForm";
import type { PurchaseOrderCriticalPath } from "../interfaces/purchase-order-critical-path.interface";
import {
  CRITICAL_PATH_COMENTARIOS_MAX,
  comentariosLength,
} from "../schemas/purchase-order-critical-path.schema";

interface PurchaseOrderCriticalPathFormProps {
  ocId: number;
  data: PurchaseOrderCriticalPath;
  /**
   * Motivo de solo lectura (OC Cancelada o sin `E-COMPRAS-OC`), o `null` si se
   * puede editar. Con aviso: campos deshabilitados y sin botón de guardar.
   */
  readOnlyNotice: string | null;
  onClose: () => void;
}

/**
 * Captura de la ruta crítica de la OC: fecha real de recibo y comentario.
 * Informativa: no cambia la OC, sus recepciones ni el inventario.
 *
 * Sin `forceUppercase` en el comentario: es una nota de seguimiento sobre una
 * orden existente, no un campo de alta.
 */
export function PurchaseOrderCriticalPathForm({
  ocId,
  data,
  readOnlyNotice,
  onClose,
}: PurchaseOrderCriticalPathFormProps) {
  const readOnly = readOnlyNotice !== null;
  const { form, isPending, hasChanges, getError, clearFieldErrors, validateField, handleFormSubmit } =
    usePurchaseOrderCriticalPathForm({ ocId, data, readOnly });

  return (
    // `noValidate`: todas las reglas las muestra Zod con su mensaje, nunca el
    // globo nativo del navegador.
    <form onSubmit={handleFormSubmit} noValidate>
      {readOnlyNotice && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 px-4 py-3 text-xs font-medium text-amber-700 dark:text-amber-400"
        >
          {readOnlyNotice}
        </p>
      )}
      <fieldset disabled={isPending || readOnly} className="space-y-4">
        <form.Field name="fecha_real_recibo">
          {(field) => (
            <FormInput
              label="Fecha real de recibo"
              type="date"
              className="dark:scheme-dark"
              name={field.name}
              value={field.state.value}
              error={getError("fecha_real_recibo")}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldErrors("fecha_real_recibo");
              }}
              onBlur={() => {
                field.handleBlur();
                validateField("fecha_real_recibo", form.state.values);
              }}
            />
          )}
        </form.Field>
        <form.Field name="comentarios">
          {(field) => (
            <div>
              <FormTextarea
                label="Comentarios"
                name={field.name}
                rows={4}
                placeholder="Notas sobre la llegada de la mercancía (opcional)"
                value={field.state.value}
                error={getError("comentarios")}
                onChange={(event) => {
                  field.handleChange(event.target.value);
                  clearFieldErrors("comentarios");
                }}
                onBlur={() => {
                  field.handleBlur();
                  validateField("comentarios", form.state.values);
                }}
              />
              {!readOnly && (
                <p className="ml-1 mt-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                  {comentariosLength(field.state.value)} / {CRITICAL_PATH_COMENTARIOS_MAX}
                </p>
              )}
            </div>
          )}
        </form.Field>
      </fieldset>

      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <div className="flex justify-end gap-3 pt-4 mt-5 border-t border-slate-100 dark:border-white/10">
            <FormCancelButton label="Cerrar" onClick={onClose} disabled={isPending} />
            {/* Solo lectura: sin botón de guardar, no uno deshabilitado. */}
            {!readOnly && (
              <FormSubmitButton
                isPending={isPending}
                loadingLabel="Guardando…"
                disabled={isPending || !hasChanges(values)}
                title={hasChanges(values) ? undefined : "No hay cambios que guardar"}
              >
                Guardar cambios
              </FormSubmitButton>
            )}
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
