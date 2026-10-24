/**
 * StepDescribe.tsx
 * Primer paso de la variante MUESTRA: sustituye al selector de catálogo.
 *
 * Una muestra es una solicitud de alta de producto, así que no hay nada que
 * elegir: se describe con texto libre y se captura su precio. El precio se pide
 * AQUÍ porque, a diferencia del catálogo, no hay `precio_base` del que partir.
 *
 * Cada muestra lleva además su CATEGORÍA de producto, obligatoria y propia de
 * la muestra (no compartida, a diferencia de los servicios). El catálogo se
 * consulta aquí y no en el hook contenedor porque ese hook también sirve a la
 * variante catálogo, que no lo necesita; la regla de "requerida" sí vive en el
 * contenedor (`isDescribeValid`), junto a descripción y precio.
 *
 * Admite N muestras por apertura, igual que catálogo admite N productos. Los
 * servicios (bordado, reflejante, corte de manga) son COMPARTIDOS por todas las
 * muestras de la apertura — mismo criterio que catálogo, donde se configuran una
 * vez y se aplican a todas las filas seleccionadas.
 */
import { memo, useEffect, useRef } from "react";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { PlusIcon } from "@/src/components/Icons";
import { useProductCategories } from "../../product-categories/hooks/useProductCategories";
import type { MuestraDraft } from "../types";
import { SleevecutCheckbox } from "./SleevecutCheckbox";

const optionClassName = "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white";

interface StepDescribeProps {
  drafts: MuestraDraft[];
  onAddDraft: () => void;
  onRemoveDraft: (id: number) => void;
  onUpdateDraft: (
    id: number,
    patch: Partial<Omit<MuestraDraft, "id">>
  ) => void;
  showErrors: boolean;
  /** Sube en cada intento fallido de continuar; ver el efecto de scroll. */
  scrollToErrorSignal: number;
  /** Empresa del documento: solo se ofrecen sus categorías. Sin ella, todas. */
  companyId?: number;
  hasEmbroidery: boolean;
  onToggleEmbroidery: (value: boolean) => void;
  hasReflective: boolean;
  onToggleReflective: (value: boolean) => void;
  hasSleevecut: boolean;
  onToggleSleevecut: (value: boolean) => void;
  /** La selección admite corte de manga (matriz prenda/proceso, CO-04). */
  sleevecutAllowed: boolean;
  sleevecutNotAllowedMessage: string;
}

export const StepDescribe = memo(function StepDescribe({
  drafts,
  onAddDraft,
  onRemoveDraft,
  onUpdateDraft,
  showErrors,
  scrollToErrorSignal,
  companyId,
  hasEmbroidery,
  onToggleEmbroidery,
  hasReflective,
  onToggleReflective,
  hasSleevecut,
  onToggleSleevecut,
  sleevecutAllowed,
  sleevecutNotAllowedMessage,
}: StepDescribeProps) {
  const {
    categories: allCategories,
    isLoading: isLoadingCategories,
    isInitialError: isErrorCategories,
    refetch: refetchCategories,
  } = useProductCategories();
  // Alcance de UI, no validación: el endpoint devuelve a un superusuario las
  // categorías de TODAS las empresas, y aquí solo tienen sentido las de la
  // empresa bajo la que se guarda la cotización.
  const categories =
    companyId == null
      ? allCategories
      : allCategories.filter((category) => category.empresa === companyId);
  const hasNoCategories =
    !isLoadingCategories && !isErrorCategories && categories.length === 0;
  const categoriaPlaceholder = isLoadingCategories
    ? "Cargando categorías..."
    : isErrorCategories
      ? "Categorías no disponibles"
      : "Seleccionar categoría...";

  // La lista de muestras tiene scroll propio: al fallar "Continuar", la primera
  // muestra inválida puede estar fuera de vista y sus errores no se verían.
  const draftsListRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (scrollToErrorSignal === 0) return;
    draftsListRef.current
      ?.querySelector('[data-muestra-invalid="true"]')
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [scrollToErrorSignal]);

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

      {/* La categoría es obligatoria: sin catálogo no se puede continuar, así
          que se dice por qué en vez de dejar selects vacíos sin explicación. La
          descripción y el precio siguen siendo capturables mientras tanto. */}
      {isErrorCategories && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          No se pudieron cargar las categorías de producto, necesarias para
          agregar una muestra.{" "}
          <button
            type="button"
            onClick={() => refetchCategories()}
            className="font-semibold underline cursor-pointer"
          >
            Reintentar
          </button>
        </p>
      )}
      {hasNoCategories && (
        <p role="alert" className="text-xs text-amber-600 dark:text-amber-400">
          No tienes categorías de producto disponibles para agregar muestras.
          Contacta a un administrador.
        </p>
      )}

      <div
        ref={draftsListRef}
        className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar"
      >
        {drafts.map((draft, index) => {
          const descripcionError =
            showErrors && !draft.descripcion.trim() ? "Requerido" : null;
          const precioError =
            showErrors && !(draft.precio > 0) ? "Debe ser positivo" : null;
          const categoriaError =
            showErrors && !(draft.categoria_producto > 0) ? "Requerido" : null;
          // Independiente de `showErrors`: marca el destino del scroll.
          const isDraftInvalid =
            !draft.descripcion.trim() ||
            !(draft.precio > 0) ||
            !(draft.categoria_producto > 0);

          return (
            <div
              key={draft.id}
              data-muestra-invalid={isDraftInvalid}
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

              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-48">
                  <FormSelect
                    name={`muestra-categoria-${index}`}
                    aria-label={`Categoría del producto de muestra ${index + 1}`}
                    value={draft.categoria_producto}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      onUpdateDraft(draft.id, {
                        categoria_producto: Number.isNaN(next) ? 0 : next,
                      });
                    }}
                    aria-invalid={Boolean(categoriaError)}
                    error={categoriaError ? { message: categoriaError } : undefined}
                    // `pl-3!` y no `px-3!`: el padding derecho (`pr-10`) es el
                    // hueco que FormSelect reserva para el chevron.
                    className="pl-3! py-2! rounded-lg!"
                  >
                    <option value="0" disabled>
                      {categoriaPlaceholder}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id} className={optionClassName}>
                        {category.nombre} ({category.codigo})
                      </option>
                    ))}
                  </FormSelect>
                </div>
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
        <SleevecutCheckbox
          id="describe-corte-manga"
          checked={hasSleevecut}
          onChange={onToggleSleevecut}
          allowed={sleevecutAllowed}
          notAllowedMessage={sleevecutNotAllowedMessage}
        />
      </div>
    </div>
  );
});
