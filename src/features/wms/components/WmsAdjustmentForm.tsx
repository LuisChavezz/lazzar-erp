"use client";

import { FormSubmitButton } from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { Loader } from "@/src/components/Loader";
import MissingPrerequisites from "../../products/components/MissingPrerequisites";
import { useWmsAdjustmentForm } from "../hooks/useWmsAdjustmentForm";

export const WmsAdjustmentForm = () => {
  const {
    form,
    isLoadingFormData,
    missingItems,
    isPending,
    productoOptions,
    ubicacionOptions,
    motivoOptions,
    cantidadActualView,
    getError,
    clearFieldError,
    handleFormSubmit,
    handleProductoChange,
    handleUbicacionChange,
  } = useWmsAdjustmentForm();

  if (isLoadingFormData) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black p-6">
        <Loader className="py-12" title="Cargando datos" message="Cargando productos y ubicaciones..." />
      </div>
    );
  }

  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
          Ajustes de inventario
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Motivo obligatorio
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full">
            <form.Field name="producto">
              {(field) => (
                <FormSelect
                  label="Producto"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    handleProductoChange(event.target.value);
                  }}
                  onBlur={field.handleBlur}
                  options={productoOptions}
                  error={getError("producto")}
                />
              )}
            </form.Field>
          </div>

          <div className="w-full">
            <form.Field name="ubicacion">
              {(field) => (
                <FormSelect
                  label="Ubicación"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    handleUbicacionChange(event.target.value);
                  }}
                  onBlur={field.handleBlur}
                  options={ubicacionOptions}
                  error={getError("ubicacion")}
                />
              )}
            </form.Field>
          </div>

          <div className="w-full">
            <form.Field name="cantidadActual">
              {(field) => (
                <FormInput
                  label="Cantidad actual"
                  name={field.name}
                  type="number"
                  readOnly
                  disabled
                  value={String(cantidadActualView)}
                  onChange={(event) => {
                    field.handleChange(Number(event.target.value) || 0);
                  }}
                  onBlur={field.handleBlur}
                  error={getError("cantidadActual")}
                />
              )}
            </form.Field>
          </div>

          <div className="w-full">
            <form.Field name="cantidadCorrecta">
              {(field) => (
                <FormInput
                  label="Cantidad correcta"
                  name={field.name}
                  type="number"
                  placeholder="Ej: 120"
                  value={Number.isFinite(field.state.value) ? String(field.state.value) : ""}
                  onChange={(event) => {
                    const nextValue = event.target.value === "" ? 0 : Number(event.target.value);
                    field.handleChange(Number.isFinite(nextValue) ? nextValue : 0);
                    clearFieldError("cantidadCorrecta");
                  }}
                  onBlur={field.handleBlur}
                  error={getError("cantidadCorrecta")}
                />
              )}
            </form.Field>
          </div>
        </div>

        <div className="w-full">
          <form.Field name="motivo">
            {(field) => (
              <FormSelect
                label="Motivo"
                name={field.name}
                value={field.state.value}
                onChange={(event) => {
                  field.handleChange(event.target.value as typeof field.state.value);
                  clearFieldError("motivo");
                }}
                onBlur={field.handleBlur}
                options={motivoOptions}
                error={getError("motivo")}
              />
            )}
          </form.Field>
        </div>

        <div className="flex justify-end">
          <FormSubmitButton isPending={isPending}>Guardar ajuste</FormSubmitButton>
        </div>
      </form>
    </div>
  );
};
