/**
 * StepDescribe.tsx
 * Primer paso de la variante MUESTRA: sustituye al selector de catálogo.
 *
 * Una muestra es una solicitud de alta de producto, así que no hay nada que
 * elegir: se describe con texto libre y se captura su precio. El precio se pide
 * AQUÍ porque, a diferencia del catálogo, no hay `precio_base` del que partir.
 *
 * Admite N muestras por apertura, igual que catálogo admite N productos. Los
 * servicios (bordado, reflejante, corte de manga) son COMPARTIDOS por todas las
 * muestras de la apertura — mismo criterio que catálogo, donde se configuran una
 * vez y se aplican a todas las filas seleccionadas.
 */
import { memo } from "react";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { PlusIcon } from "@/src/components/Icons";
import type { MuestraDraft } from "../types";

interface StepDescribeProps {
  drafts: MuestraDraft[];
  onAddDraft: () => void;
  onRemoveDraft: (id: number) => void;
  onUpdateDraft: (
    id: number,
    patch: Partial<Omit<MuestraDraft, "id">>
  ) => void;
  showErrors: boolean;
  hasEmbroidery: boolean;
  onToggleEmbroidery: (value: boolean) => void;
  hasReflective: boolean;
  onToggleReflective: (value: boolean) => void;
  hasSleevecut: boolean;
  onToggleSleevecut: (value: boolean) => void;
}

export const StepDescribe = memo(function StepDescribe({
  drafts,
  onAddDraft,
  onRemoveDraft,
  onUpdateDraft,
  showErrors,
  hasEmbroidery,
  onToggleEmbroidery,
  hasReflective,
  onToggleReflective,
  hasSleevecut,
  onToggleSleevecut,
}: StepDescribeProps) {
  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Productos de muestra
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Describe cada producto solicitado. Se registran como solicitud de
            alta, sin código de catálogo ni color.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddDraft}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg text-xs font-bold tracking-wide hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-colors cursor-pointer"
          aria-label="Agregar otro producto de muestra"
        >
          <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
          Agregar otro
        </button>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
        {drafts.map((draft, index) => {
          const descripcionError =
            showErrors && !draft.descripcion.trim() ? "Requerido" : null;
          const precioError =
            showErrors && !(draft.precio > 0) ? "Debe ser positivo" : null;

          return (
            <div
              key={draft.id}
              className="rounded-xl border border-slate-200 dark:border-white/10 p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Muestra {index + 1}
                </span>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveDraft(draft.id)}
                    aria-label={`Eliminar producto de muestra ${index + 1}`}
                    title="Eliminar"
                    className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <FormTextarea
                name={`muestra-descripcion-${index}`}
                aria-label={`Descripción del producto de muestra ${index + 1}`}
                placeholder="Describe el producto solicitado..."
                maxLength={350}
                rows={2}
                value={draft.descripcion}
                onChange={(event) =>
                  onUpdateDraft(draft.id, { descripcion: event.target.value })
                }
                aria-invalid={Boolean(descripcionError)}
                error={descripcionError ? { message: descripcionError } : undefined}
                forceUppercase
                className="px-3! py-2! rounded-lg!"
              />

              <div className="w-44">
                <FormInput
                  variant="compact"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  name={`muestra-precio-${index}`}
                  aria-label={`Precio unitario del producto de muestra ${index + 1}`}
                  value={draft.precio}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    onUpdateDraft(draft.id, {
                      precio: Number.isNaN(next) ? 0 : next,
                    });
                  }}
                  aria-invalid={Boolean(precioError)}
                  error={precioError ? { message: precioError } : undefined}
                  forceUppercase={false}
                  leading="$"
                  className="text-right"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Mismos servicios que catálogo. Viven aquí porque en catálogo están en
          el paso de selección, que la variante muestra no recorre: sin esto,
          los pasos de bordado y reflejante serían inalcanzables. Se aplican a
          TODAS las muestras de esta apertura. */}
      <div className="flex items-center gap-4 flex-wrap pt-3 border-t border-slate-100 dark:border-white/10">
        <label
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none"
          htmlFor="describe-bordados"
        >
          <input
            id="describe-bordados"
            type="checkbox"
            checked={hasEmbroidery}
            onChange={(event) => onToggleEmbroidery(event.target.checked)}
            className="w-4 h-4 rounded border-slate-300"
          />
          Agregar Bordado
        </label>
        <label
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none"
          htmlFor="describe-reflejante"
        >
          <input
            id="describe-reflejante"
            type="checkbox"
            checked={hasReflective}
            onChange={(event) => onToggleReflective(event.target.checked)}
            className="w-4 h-4 rounded border-slate-300"
          />
          Agregar Reflejante
        </label>
        <label
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none"
          htmlFor="describe-corte-manga"
        >
          <input
            id="describe-corte-manga"
            type="checkbox"
            checked={hasSleevecut}
            onChange={(event) => onToggleSleevecut(event.target.checked)}
            className="w-4 h-4 rounded border-slate-300"
          />
          Corte de manga
        </label>
      </div>
    </div>
  );
});
