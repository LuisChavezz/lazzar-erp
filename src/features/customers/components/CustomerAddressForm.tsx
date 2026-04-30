"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormToggle } from "@/src/components/FormToggle";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { HomeIcon, MapPinIcon } from "@/src/components/Icons";
import { useCustomerAddressForm } from "../hooks/useCustomerAddressForm";
import { CustomerAddress } from "../interfaces/customer-address.interface";

interface CustomerAddressFormProps {
  customerId: number;
  /** Dirección a editar. Si se provee, el formulario opera en modo edición. */
  addressToEdit?: CustomerAddress | null;
  onSuccess?: () => void;
}

export default function CustomerAddressForm({
  customerId,
  addressToEdit,
  onSuccess,
}: CustomerAddressFormProps) {
  const {
    form,
    formRef,
    isPending,
    isEditing,
    getError,
    clearFieldError,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useCustomerAddressForm({ customerId, addressToEdit, onSuccess });

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">

        {/* ─── Sección: Contacto de entrega ─────────────────────────────── */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-6">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <HomeIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-base">
                Contacto de Entrega
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Persona y empresa que recibirá el envío
              </p>
            </div>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Destinatario */}
            <form.Field name="destinatario">
              {(field) => (
                <FormInput
                  label="Destinatario"
                  name="destinatario"
                  placeholder="Nombre de quien recibe"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldError("destinatario");
                  }}
                  onBlur={() =>
                    validateField("destinatario", field.state.value)
                  }
                  error={getError("destinatario")}
                  autoComplete="off"
                />
              )}
            </form.Field>

            {/* Empresa de envío */}
            <form.Field name="empresa_envio">
              {(field) => (
                <FormInput
                  label="Empresa de envío"
                  name="empresa_envio"
                  placeholder="Nombre de la empresa"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldError("empresa_envio");
                  }}
                  onBlur={() =>
                    validateField("empresa_envio", field.state.value)
                  }
                  error={getError("empresa_envio")}
                  autoComplete="off"
                />
              )}
            </form.Field>

            {/* Teléfono de envío */}
            <form.Field name="telefono_envio">
              {(field) => (
                <FormInput
                  label="Teléfono"
                  name="telefono_envio"
                  type="tel"
                  placeholder="10 dígitos"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldError("telefono_envio");
                  }}
                  onBlur={() =>
                    validateField("telefono_envio", field.state.value)
                  }
                  error={getError("telefono_envio")}
                  autoComplete="off"
                />
              )}
            </form.Field>

            {/* Celular de envío */}
            <form.Field name="celular_envio">
              {(field) => (
                <FormInput
                  label="Celular"
                  name="celular_envio"
                  type="tel"
                  placeholder="10 dígitos"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldError("celular_envio");
                  }}
                  onBlur={() =>
                    validateField("celular_envio", field.state.value)
                  }
                  error={getError("celular_envio")}
                  autoComplete="off"
                />
              )}
            </form.Field>
          </div>
        </section>

        {/* ─── Sección: Dirección ───────────────────────────────────────── */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-6">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <MapPinIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-base">
                Dirección de Envío
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Datos completos de la ubicación de entrega
              </p>
            </div>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Calle y número */}
            <div className="sm:col-span-2">
              <form.Field name="direccion_envio">
                {(field) => (
                  <FormInput
                    label="Calle y número"
                    name="direccion_envio"
                    placeholder="Av. Reforma 100, Int. 5"
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      clearFieldError("direccion_envio");
                    }}
                    onBlur={() =>
                      validateField("direccion_envio", field.state.value)
                    }
                    error={getError("direccion_envio")}
                    autoComplete="off"
                  />
                )}
              </form.Field>
            </div>

            {/* Colonia */}
            <form.Field name="colonia_envio">
              {(field) => (
                <FormInput
                  label="Colonia"
                  name="colonia_envio"
                  placeholder="Nombre de la colonia"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldError("colonia_envio");
                  }}
                  onBlur={() =>
                    validateField("colonia_envio", field.state.value)
                  }
                  error={getError("colonia_envio")}
                  autoComplete="off"
                />
              )}
            </form.Field>

            {/* Código postal */}
            <form.Field name="codigo_postal">
              {(field) => (
                <FormInput
                  label="Código Postal"
                  name="codigo_postal"
                  placeholder="00000"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldError("codigo_postal");
                  }}
                  onBlur={() =>
                    validateField("codigo_postal", field.state.value)
                  }
                  error={getError("codigo_postal")}
                  autoComplete="off"
                />
              )}
            </form.Field>

            {/* Ciudad */}
            <form.Field name="ciudad_envio">
              {(field) => (
                <FormInput
                  label="Ciudad"
                  name="ciudad_envio"
                  placeholder="Ciudad"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldError("ciudad_envio");
                  }}
                  onBlur={() =>
                    validateField("ciudad_envio", field.state.value)
                  }
                  error={getError("ciudad_envio")}
                  autoComplete="off"
                />
              )}
            </form.Field>

            {/* Estado */}
            <form.Field name="estado_envio">
              {(field) => (
                <FormInput
                  label="Estado"
                  name="estado_envio"
                  placeholder="Estado"
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldError("estado_envio");
                  }}
                  onBlur={() =>
                    validateField("estado_envio", field.state.value)
                  }
                  error={getError("estado_envio")}
                  autoComplete="off"
                />
              )}
            </form.Field>

            {/* Referencias */}
            <div className="sm:col-span-2">
              <form.Field name="referencias">
                {(field) => (
                  <FormInput
                    label="Referencias"
                    name="referencias"
                    placeholder="Entre calles, color de fachada, referencias adicionales..."
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      clearFieldError("referencias");
                    }}
                    onBlur={() =>
                      validateField("referencias", field.state.value)
                    }
                    error={getError("referencias")}
                    autoComplete="off"
                  />
                )}
              </form.Field>
            </div>

            {/* Dirección predeterminada */}
            <div className="sm:col-span-2">
              <form.Field name="is_default">
                {(field) => (
                  <FormToggle
                    name="is_default"
                    description="Establecer como dirección predeterminada"
                    checked={field.state.value ?? false}
                    onChange={(e) => field.handleChange(e.target.checked)}
                  />
                )}
              </form.Field>
            </div>
          </div>
        </section>

        {/* ─── Botones de acción ───────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <FormCancelButton
            onClick={handleReset}
            label={isEditing ? "Restablecer" : "Limpiar"}
            disabled={isPending}
          />
          <FormSubmitButton isPending={isPending}>
            {isEditing ? "Actualizar Dirección" : "Guardar Dirección"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
