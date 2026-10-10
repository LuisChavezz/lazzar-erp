"use client";

import { FormSelect } from "@/src/components/FormSelect";
import { InfoField } from "@/src/components/DetailDialogPrimitives";
import { BomStep1 } from "@/src/features/bom/components/BomStep1";
import { useColors } from "@/src/features/colors/hooks/useColors";
import type { SpecialOrderLine } from "../interfaces/special-order.interface";
import type { SampleSkuOnboardingForm } from "../hooks/useSampleSkuOnboardingForm";

interface SampleSkuOnboardingStep1Props {
  line: SpecialOrderLine;
  onboarding: SampleSkuOnboardingForm;
  /** Materiales ya elegidos (al regresar del Paso 2). */
  initialSelectedIds: readonly number[];
  /** Avanza al Paso 2 con los materiales elegidos. */
  onNext: (componentIds: number[]) => void;
  /** Cierra el asistente (es el primer paso). */
  onClose: () => void;
}

/**
 * Paso 1 del alta de SKU de muestra: el color de la línea y la selección de
 * materiales.
 *
 * El color solo se CAPTURA cuando la línea no tiene uno (el backend lo exige y
 * lo guarda en la línea); si ya lo tiene se muestra de solo lectura y no viaja.
 * El catálogo (`/catalogo/color`) ya llega filtrado a colores activos; aquí se
 * descartan además los que no tienen `codigo`, porque el SKU lo lleva y el
 * backend los rechaza.
 *
 * Los materiales reutilizan `BomStep1` tal cual: su botón "Continuar" es el del
 * paso, por eso el color se valida en `onNext` y no con un botón propio.
 */
export function SampleSkuOnboardingStep1({
  line,
  onboarding,
  initialSelectedIds,
  onNext,
  onClose,
}: SampleSkuOnboardingStep1Props) {
  const { form, requiresColor, getError, clearError, validateColor } = onboarding;
  const { colors, isLoading: isLoadingColors, isInitialError: isErrorColors } = useColors();
  const colorOptions = colors.filter((color) => Boolean(color.codigo));

  return (
    <div className="flex flex-col gap-5">
      {requiresColor ? (
        <form.Field name="color">
          {(field) => (
            <div>
              <FormSelect
                label="Color de la línea"
                name={field.name}
                value={field.state.value}
                disabled={isLoadingColors || isErrorColors}
                onChange={(event) => {
                  field.handleChange(Number(event.target.value) || 0);
                  clearError("color");
                }}
                error={getError("color")}
              >
                <option value="0" disabled>
                  {isLoadingColors ? "Cargando colores..." : "Seleccionar..."}
                </option>
                {colorOptions.map((color) => (
                  <option
                    key={color.id}
                    value={color.id}
                    className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  >
                    {color.nombre} ({color.codigo})
                  </option>
                ))}
              </FormSelect>
              {isErrorColors ? (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  No se pudieron cargar los colores. Cierra el diálogo e inténtalo de nuevo.
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 ml-1">
                  Esta línea no tiene color. El que elijas se guarda en la línea del pedido y forma
                  parte del SKU.
                </p>
              )}
            </div>
          )}
        </form.Field>
      ) : (
        <InfoField label="Color de la línea">{line.color_nombre}</InfoField>
      )}

      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2">
          Materiales
        </p>
        <BomStep1
          initialSelectedIds={initialSelectedIds}
          onNext={(componentIds) => {
            if (validateColor()) onNext(componentIds);
          }}
          onBack={onClose}
        />
      </div>
    </div>
  );
}
