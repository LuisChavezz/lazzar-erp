"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormToggle } from "@/src/components/FormToggle";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { FormSection } from "@/src/components/FormSection";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { getCodigoPostalInputProps } from "@/src/utils/codigoPostal";
import { useCustomerAddressForm } from "../hooks/useCustomerAddressForm";
import { CustomerAddress } from "../interfaces/customer-address.interface";

interface CustomerAddressFormProps {
  customerId: number;
  /** RFC guardado del cliente: decide la regla del CP (ver `useCustomerAddressForm`). */
  customerRfc: string;
  /** Dirección a editar. Si se provee, el formulario opera en modo edición. */
  addressToEdit?: CustomerAddress | null;
  onSuccess?: () => void;
}

/** Rejilla de cada sección: dos columnas compactas (mismo molde que EC-753). */
const SECTION_GRID_CLS = "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3";

export default function CustomerAddressForm({
  customerId,
  customerRfc,
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
  } = useCustomerAddressForm({ customerId, customerRfc, addressToEdit, onSuccess });

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">

        {/* ─── Sección: Contacto de entrega ─────────────────────────────── */}
        <FormSection title="Contacto de Entrega" description="Persona y empresa que recibirá el envío">
          <div className={SECTION_GRID_CLS}>
            {/* Destinatario */}
            <form.Field name="destinatario">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Destinatario"
                  name="destinatario"
                  placeholder="Nombre de quien recibe"
                  forceUppercase
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
                  className={COMPACT_FIELD_CLS}
                  label="Empresa de envío"
                  name="empresa_envio"
                  placeholder="Nombre de la empresa"
                  forceUppercase
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
                  className={COMPACT_FIELD_CLS}
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
                  className={COMPACT_FIELD_CLS}
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
        </FormSection>

        {/* ─── Sección: Dirección ───────────────────────────────────────── */}
        <FormSection title="Dirección de Envío" description="Datos completos de la ubicación de entrega">
          <div className={SECTION_GRID_CLS}>
            {/* Calle y número */}
            <div className="sm:col-span-2">
              <form.Field name="direccion_envio">
                {(field) => (
                  <FormInput
                    className={COMPACT_FIELD_CLS}
                    label="Calle y número"
                    name="direccion_envio"
                    placeholder="Av. Reforma 100, Int. 5"
                    forceUppercase
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
                  className={COMPACT_FIELD_CLS}
                  label="Colonia"
                  name="colonia_envio"
                  placeholder="Nombre de la colonia"
                  forceUppercase
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
                  className={COMPACT_FIELD_CLS}
                  label="Código Postal"
                  name="codigo_postal"
                  {...getCodigoPostalInputProps(customerRfc)}
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
                  className={COMPACT_FIELD_CLS}
                  label="Ciudad"
                  name="ciudad_envio"
                  placeholder="Ciudad"
                  forceUppercase
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
                  className={COMPACT_FIELD_CLS}
                  label="Estado"
                  name="estado_envio"
                  placeholder="Estado"
                  forceUppercase
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
                    className={COMPACT_FIELD_CLS}
                    label="Referencias"
                    name="referencias"
                    placeholder="Entre calles, color de fachada, referencias adicionales..."
                    forceUppercase
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
        </FormSection>

        {/* ─── Botones de acción ───────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-1">
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
