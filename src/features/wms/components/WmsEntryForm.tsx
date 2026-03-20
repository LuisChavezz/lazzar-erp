"use client";

import { FormSubmitButton } from "@/src/components/FormButtons";
import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { AddProductDialog } from "./AddProductDialog";
import { useWmsEntryForm } from "../hooks/useWmsEntryForm";

export const WmsEntryForm = () => {
  const {
    form,
    isPending,
    userName,
    items,
    submitError,
    isDialogOpen,
    movimientoOptions,
    getError,
    clearFieldError,
    setIsDialogOpen,
    handleFormSubmit,
    handleAddItem,
    handleRemoveItem,
  } = useWmsEntryForm();

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
          Entradas de inventario
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Registrar ingreso de inventario.
        </p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <form.Field name="usuario">
          {(field) => <input type="hidden" name={field.name} value={userName} readOnly />}
        </form.Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="w-full">
            <form.Field name="tipoMovimiento">
              {(field) => (
                <FormSelect
                  label="Tipo movimiento"
                  options={movimientoOptions}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value as typeof field.state.value);
                    clearFieldError("tipoMovimiento");
                  }}
                  onBlur={field.handleBlur}
                  error={getError("tipoMovimiento")}
                />
              )}
            </form.Field>
          </div>

          <div className="w-full">
            <form.Field name="fecha">
              {(field) => (
                <FormInput
                  label="Fecha"
                  type="date"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldError("fecha");
                  }}
                  onBlur={field.handleBlur}
                  error={getError("fecha")}
                />
              )}
            </form.Field>
          </div>

          <div className="w-full">
            <form.Field name="referencia">
              {(field) => (
                <FormInput
                  label="Referencia"
                  placeholder="OC-000123 / Remisión / Folio"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldError("referencia");
                  }}
                  onBlur={field.handleBlur}
                  error={getError("referencia")}
                />
              )}
            </form.Field>
          </div>

          <div className="w-full">
            <form.Field name="proveedor">
              {(field) => (
                <FormInput
                  label="Proveedor"
                  placeholder="Proveedor S.A."
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldError("proveedor");
                  }}
                  onBlur={field.handleBlur}
                  error={getError("proveedor")}
                />
              )}
            </form.Field>
          </div>

          <div className="w-full md:col-span-2">
            <FormInput
              label="Usuario"
              value={userName}
              placeholder="Operador WMS"
              readOnly
              title="El usuario se toma de tu sesión"
              disabled
            />
            {getError("usuario") && (
              <p className="text-xs text-red-600 mt-1 font-medium animate-in slide-in-from-top-1 fade-in duration-200">
                {getError("usuario")?.message}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-50/60 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Productos agregados
            </div>
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              Agregar producto
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white dark:bg-black">
              <thead className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold">Producto</th>
                  <th className="px-4 py-3 font-semibold text-right">Cantidad</th>
                  <th className="px-4 py-3 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                    >
                      Agrega productos usando el botón de arriba.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr
                      key={`${item.productoId}-${index}`}
                      className="border-b border-slate-100 dark:border-white/10 last:border-b-0"
                    >
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200 font-medium">
                        {item.productoNombre}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200 text-right font-semibold">
                        {item.cantidad.toLocaleString("es-MX")}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {getError("items")?.message && (
            <div className="px-4 py-3 text-xs text-red-600 font-medium border-t border-slate-100 dark:border-white/10">
              {getError("items")?.message}
            </div>
          )}
        </div>

        {submitError && (
          <div className="text-sm text-red-600 font-medium">{submitError}</div>
        )}

        <div className="flex justify-end">
          <FormSubmitButton isPending={isPending}>Guardar movimiento</FormSubmitButton>
        </div>
      </form>

      <AddProductDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onAddItem={handleAddItem}
      />
    </div>
  );
};
