"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { Banco } from "../interfaces/bank.interface";
import { useBankForm } from "../hooks/useBankForm";

interface BankFormProps {
  onSuccess: () => void;
  bankToEdit?: Banco | null;
}

/** Formulario de un solo bloque: compacto, sin secciones (ver `DIALOG_WIDTH_FORM`). */
export default function BankForm({ onSuccess, bankToEdit }: BankFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useBankForm({
    onSuccess,
    bankToEdit,
  });

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          <div className="group/field md:col-span-2">
            <form.Field name="nombre">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Nombre del Banco"
                  placeholder="Ej. BBVA"
                  forceUppercase
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
            <form.Field name="codigo">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Código"
                  placeholder="Ej. 012"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("codigo");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("codigo", field.state.value);
                  }}
                  error={getError("codigo")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="swift">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="SWIFT / BIC"
                  placeholder="Ej. BCMRMXMM (opcional)"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("swift");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("swift", field.state.value);
                  }}
                  error={getError("swift")}
                />
              )}
            </form.Field>
          </div>

          {/*
            El estatus (`activo`) NO se captura aquí: se administra desde la
            acción "Activar"/"Desactivar" de la fila. Como la edición usa
            PATCH y este payload no incluye `activo`, guardar el formulario
            conserva el estatus actual.
          */}

          <div className="group/field md:col-span-2">
            <form.Field name="observaciones">
              {(field) => (
                <FormTextarea
                  className={COMPACT_FIELD_CLS}
                  label="Observaciones"
                  rows={3}
                  placeholder="Notas internas sobre el banco (opcional)"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("observaciones");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("observaciones", field.state.value);
                  }}
                  error={getError("observaciones")}
                />
              )}
            </form.Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {bankToEdit ? "Actualizar Banco" : "Registrar Banco"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
