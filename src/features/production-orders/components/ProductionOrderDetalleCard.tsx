"use client";

import { useEffect } from "react";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import type { FormFieldError } from "@/src/utils/getFieldError";
import type { UnitOfMeasure } from "@/src/features/units-of-measure/interfaces/unit-of-measure.interface";
import { useBom } from "@/src/features/bom/hooks/useBom";
import type { useCreateProductionOrderForm } from "@/src/features/production-orders/hooks/useCreateProductionOrderForm";

/** Instancia de TanStack Form expuesta por el hook del asistente. */
type CreateProductionOrderFormApi = ReturnType<
  typeof useCreateProductionOrderForm
>["form"];

interface ProductionOrderDetalleCardProps {
  /** Variante de producto de este renglón (`producto_variante_id`). */
  variantId: number;
  /** Índice del renglón dentro de `orden_produccion_detalle`. */
  index: number;
  /** Instancia de TanStack Form compartida del asistente. */
  form: CreateProductionOrderFormApi;
  /** Unidades de medida disponibles (catálogo cargado una vez en el Paso 2). */
  units: UnitOfMeasure[];
  /** Etiqueta legible de la variante para el encabezado de la tarjeta. */
  variantLabel: string;
  /** Devuelve el error de un campo por ruta. */
  getError: (path: string) => FormFieldError | undefined;
  /** Limpia el error de un campo por ruta. */
  clearError: (path: string) => void;
}

/** Convierte el value de un input a número, con 0 como respaldo. */
function toNumber(raw: string): number {
  if (raw === "") return 0;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * ProductionOrderDetalleCard
 *
 * Tarjeta de configuración para un renglón de `orden_produccion_detalle`.
 * Resuelve las listas de materiales (BOM) de su variante vía {@link useBom}
 * (cada tarjeta hace su propia consulta, por eso es un componente aislado) y
 * permite elegir la BOM, la cantidad, la unidad y las observaciones. Si la
 * variante tiene una sola BOM, se autoselecciona.
 */
export function ProductionOrderDetalleCard({
  variantId,
  index,
  form,
  units,
  variantLabel,
  getError,
  clearError,
}: ProductionOrderDetalleCardProps) {
  const { bom: boms, isLoading } = useBom(variantId);

  // Autoselección cuando la variante tiene una única lista de materiales.
  useEffect(() => {
    if (
      boms.length === 1 &&
      form.getFieldValue(`orden_produccion_detalle[${index}].bom`) !==
        boms[0].bom_id
    ) {
      form.setFieldValue(
        `orden_produccion_detalle[${index}].bom`,
        boms[0].bom_id,
      );
    }
  }, [boms, index, form]);

  const hasBoms = boms.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4 space-y-4">
      {/* Encabezado: nombre de la variante */}
      <div className="flex items-center gap-2">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 text-xs font-bold text-sky-700 dark:text-sky-300">
          {index + 1}
        </span>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-white truncate">
          {variantLabel}
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Lista de materiales (BOM) */}
        <form.Field name={`orden_produccion_detalle[${index}].bom`}>
          {(field) => (
            <FormSelect
              label="Lista de materiales"
              name={field.name}
              value={field.state.value}
              disabled={isLoading || !hasBoms}
              onChange={(event) => {
                field.handleChange(toNumber(event.target.value));
                clearError(`orden_produccion_detalle.${index}.bom`);
              }}
              error={getError(`orden_produccion_detalle.${index}.bom`)}
            >
              <option value="0" disabled>
                {isLoading
                  ? "Cargando listas..."
                  : hasBoms
                    ? "Seleccionar lista..."
                    : "Sin listas de materiales"}
              </option>
              {boms.map((bomItem) => (
                <option
                  key={bomItem.bom_id}
                  value={bomItem.bom_id}
                  className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                >
                  Versión {bomItem.version}
                </option>
              ))}
            </FormSelect>
          )}
        </form.Field>

        {/* Cantidad */}
        <form.Field name={`orden_produccion_detalle[${index}].cantidad`}>
          {(field) => (
            <FormInput
              label="Cantidad"
              type="number"
              step="any"
              min={0}
              inputMode="decimal"
              placeholder="0"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(toNumber(event.target.value));
                clearError(`orden_produccion_detalle.${index}.cantidad`);
              }}
              error={getError(`orden_produccion_detalle.${index}.cantidad`)}
            />
          )}
        </form.Field>

        {/* Unidad */}
        <form.Field name={`orden_produccion_detalle[${index}].unidad`}>
          {(field) => (
            <FormSelect
              label="Unidad"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(toNumber(event.target.value));
                clearError(`orden_produccion_detalle.${index}.unidad`);
              }}
              error={getError(`orden_produccion_detalle.${index}.unidad`)}
            >
              <option value="0" disabled>
                Seleccionar...
              </option>
              {units.map((unit) => (
                <option
                  key={unit.id}
                  value={unit.id}
                  className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                >
                  {unit.clave} — {unit.nombre}
                </option>
              ))}
            </FormSelect>
          )}
        </form.Field>
      </div>

      {/* Observaciones por renglón */}
      <form.Field name={`orden_produccion_detalle[${index}].observaciones`}>
        {(field) => (
          <FormTextarea
            label="Observaciones"
            placeholder="Notas para este producto (opcional)"
            rows={2}
            name={field.name}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
    </div>
  );
}
