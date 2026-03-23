"use client";

import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormTextarea } from "../../../components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { InfoIcon, ProductIcon, SettingsIcon } from "../../../components/Icons";
import MissingPrerequisites from "./MissingPrerequisites";
import { Product } from "../interfaces/product.interface";
import { useProductForm } from "../hooks/useProductForm";

interface ProductFormProps {
  onSuccess: () => void;
  productToEdit?: Product | null;
}

export default function ProductForm({ onSuccess, productToEdit }: ProductFormProps) {
  const {
    form,
    formRef,
    formKey,
    isEditing,
    isPending,
    keepCreating,
    setKeepCreating,
    missingItems,
    categories,
    units,
    taxes,
    satProdservCodes,
    satUnitCodes,
    productTypes,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useProductForm({
    onSuccess,
    productToEdit,
  });

  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <ProductIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base del producto</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="nombre">
                  {(field) => (
                    <FormInput
                      label="Nombre"
                      placeholder="Ej. Playera básica"
                      className="text-2xl font-bold"
                      variant="ghost"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("nombre");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("nombre", field.state.value);
                      }}
                      error={getError("nombre")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="tipo">
                  {(field) => (
                    <FormSelect
                      label="Tipo"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("tipo");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("tipo", field.state.value);
                      }}
                      error={getError("tipo")}
                    >
                      <option value="" disabled>
                        Seleccionar...
                      </option>
                      {productTypes.map((type) => (
                        <option
                          key={type.id}
                          value={type.codigo}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {type.codigo}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              </div>

              <form.Field name="categoria_producto">
                {(field) => (
                  <FormSelect
                    label="Categoría"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                      clearFieldErrors("categoria_producto");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("categoria_producto", field.state.value);
                    }}
                    error={getError("categoria_producto")}
                  >
                    <option value="0" disabled>
                      Seleccionar...
                    </option>
                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {category.nombre}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

              <div className="group/field">
                <form.Field name="precio_base">
                  {(field) => (
                    <FormInput
                      label="Precio Base"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      name={field.name}
                      value={field.state.value || ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        field.handleChange(value === "" ? 0 : Number(value));
                        clearFieldErrors("precio_base");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("precio_base", field.state.value);
                      }}
                      error={getError("precio_base")}
                      className="dark:scheme-dark"
                    />
                  )}
                </form.Field>
              </div>

              <div className="md:col-span-2">
                <form.Field name="descripcion">
                  {(field) => (
                    <FormTextarea
                      label="Descripción"
                      rows={3}
                      placeholder="Describe el producto"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("descripcion");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("descripcion", field.state.value);
                      }}
                      error={getError("descripcion")}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <InfoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Clasificación y SAT
              </h3>
              <p className="text-xs text-slate-500">Datos de clasificación fiscal y operativa</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <form.Field name="unidad_medida">
                {(field) => (
                  <FormSelect
                    label="Unidad de Medida"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                      clearFieldErrors("unidad_medida");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("unidad_medida", field.state.value);
                    }}
                    error={getError("unidad_medida")}
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
                        {unit.clave} - {unit.nombre}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

              <form.Field name="impuesto">
                {(field) => (
                  <FormSelect
                    label="Impuesto"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                      clearFieldErrors("impuesto");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("impuesto", field.state.value);
                    }}
                    error={getError("impuesto")}
                  >
                    <option value="0" disabled>
                      Seleccionar...
                    </option>
                    {taxes.map((tax) => (
                      <option
                        key={tax.id}
                        value={tax.id}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {tax.nombre}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

              <form.Field name="sat_prodserv">
                {(field) => (
                  <FormSelect
                    label="SAT Prod/Serv"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                      clearFieldErrors("sat_prodserv");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("sat_prodserv", field.state.value);
                    }}
                    error={getError("sat_prodserv")}
                  >
                    <option value="0" disabled>
                      Seleccionar...
                    </option>
                    {satProdservCodes.map((code) => (
                      <option
                        key={code.id_sat_prodserv}
                        value={code.id_sat_prodserv}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {code.codigo} - {code.descripcion}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>

              <form.Field name="sat_unidad">
                {(field) => (
                  <FormSelect
                    label="SAT Unidad"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value);
                      field.handleChange(Number.isNaN(nextValue) ? 0 : nextValue);
                      clearFieldErrors("sat_unidad");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("sat_unidad", field.state.value);
                    }}
                    error={getError("sat_unidad")}
                  >
                    <option value="0" disabled>
                      Seleccionar...
                    </option>
                    {satUnitCodes.map((code) => (
                      <option
                        key={code.id_sat_unidad}
                        value={code.id_sat_unidad}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {code.codigo} - {code.descripcion}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <div className="w-full">
          <div className="w-full space-y-8">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                    Estado
                  </h3>
                  <p className="text-xs text-slate-500">Control de disponibilidad</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-4 py-3">
                  <form.Field name="activo">
                    {(field) => (
                      <>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                          checked={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.checked);
                            clearFieldErrors("activo");
                          }}
                          onBlur={() => {
                            field.handleBlur();
                            validateField("activo", field.state.value);
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {field.state.value ? "Producto activo" : "Producto inactivo"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {field.state.value ? "Disponible para catálogos" : "No disponible para selección"}
                          </p>
                        </div>
                      </>
                    )}
                  </form.Field>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pb-8 mt-8 sm:flex-row sm:items-center sm:justify-end">
          {!isEditing ? (
            <label className="inline-flex items-center gap-2 rounded-xl border cursor-pointer border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={keepCreating}
                onChange={(event) => setKeepCreating(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 focus:ring-sky-500"
                aria-label="Seguir registrando"
              />
              Seguir registrando
            </label>
          ) : null}
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}
          >
            {isEditing ? "Actualizar Producto" : "Registrar Producto"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
