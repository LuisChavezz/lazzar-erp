"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { BancosIcon } from "@/src/components/Icons";
import { Banco } from "../interfaces/bank.interface";
import { useBankForm } from "../hooks/useBankForm";

interface BankFormProps {
  onSuccess: () => void;
  bankToEdit?: Banco | null;
}

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
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <BancosIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información General
              </h3>
              <p className="text-xs text-slate-500">Datos base de la institución bancaria</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="nombre">
                  {(field) => (
                    <FormInput
                      label="Nombre del Banco"
                      placeholder="Ej. BBVA"
                      forceUppercase
                      variant="ghost"
                      className="text-3xl font-bold"
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
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {bankToEdit ? "Actualizar Banco" : "Registrar Banco"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
