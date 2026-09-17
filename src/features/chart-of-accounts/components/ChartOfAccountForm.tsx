"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormToggle } from "@/src/components/FormToggle";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { PlanCuentasIcon } from "@/src/components/Icons";
import { CUENTA_CONTABLE_TIPOS } from "../constants/chartOfAccountTipo";
import type { CuentaContable } from "../interfaces/chart-of-account.interface";
import { useChartOfAccountForm } from "../hooks/useChartOfAccountForm";

interface ChartOfAccountFormProps {
  onSuccess: () => void;
  cuentaToEdit?: CuentaContable | null;
}

/**
 * Alta y edición de una cuenta contable.
 *
 * NO se capturan aquí:
 *  - `empresa`: la resuelve el backend.
 *  - `cuenta_padre`: fuera del alcance de esta fase. Como la edición usa PATCH y
 *    el payload no lo incluye, una cuenta que ya tenga padre lo CONSERVA.
 *  - `activo`: se administra desde la acción "Activar"/"Desactivar" de la fila,
 *    por el mismo motivo — lo que no viaja en el PATCH no cambia.
 */
export default function ChartOfAccountForm({
  onSuccess,
  cuentaToEdit,
}: ChartOfAccountFormProps) {
  const {
    form,
    formRef,
    isPending,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useChartOfAccountForm({ onSuccess, cuentaToEdit });

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending}>
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <PlanCuentasIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información de la Cuenta
              </h3>
              <p className="text-xs text-slate-500">
                Código, nombre y naturaleza contable del catálogo
              </p>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <form.Field name="nombre">
                {(field) => (
                  <FormInput
                    label="Nombre de la Cuenta"
                    placeholder="Ej. Bancos moneda nacional"
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

            <div>
              <form.Field name="codigo">
                {(field) => (
                  <FormInput
                    label="Código"
                    placeholder="Ej. 1100"
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
              {!getError("codigo") && (
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  No puede repetirse en el catálogo de la empresa.
                </p>
              )}
            </div>

            <div>
              <form.Field name="tipo">
                {(field) => (
                  <FormSelect
                    label="Tipo"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      // El valor del `<option>` ES el del enum del backend.
                      field.handleChange(
                        event.target.value as (typeof CUENTA_CONTABLE_TIPOS)[number],
                      );
                      clearFieldErrors("tipo");
                    }}
                    error={getError("tipo")}
                  >
                    {CUENTA_CONTABLE_TIPOS.map((tipo) => (
                      <option
                        key={tipo}
                        value={tipo}
                        className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                      >
                        {tipo}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </form.Field>
            </div>

            <div>
              <form.Field name="nivel">
                {(field) => (
                  <FormInput
                    label="Nivel"
                    inputMode="numeric"
                    placeholder="Ej. 1"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      // El valor entra CRUDO y lo juzga el esquema (`^\d+$`), igual
                      // que `numero_cuenta`/`clabe` en cuentas bancarias o `nss` en
                      // empleados. NO se filtran los no-dígitos: quitarlos pegaría
                      // los que quedan y convertiría un decimal en otro entero
                      // —"2.5" se guardaría como 25—, un nivel que el usuario nunca
                      // capturó y que el esquema ya no podría rechazar porque sería
                      // válido. Así, "2.5" llega tal cual y el campo avisa.
                      field.handleChange(event.target.value);
                      clearFieldErrors("nivel");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("nivel", field.state.value);
                    }}
                    error={getError("nivel")}
                  />
                )}
              </form.Field>
            </div>

            <div>
              <form.Field name="acepta_movimientos">
                {(field) => (
                  <FormToggle
                    label="Acepta movimientos"
                    description={
                      field.state.value
                        ? "Admite asientos directos en una póliza"
                        : "Cuenta de agrupación: solo suma a sus hijas"
                    }
                    name={field.name}
                    checked={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.checked);
                      clearFieldErrors("acepta_movimientos");
                    }}
                    error={getError("acepta_movimientos")}
                  />
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pb-4">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {isEditing ? "Actualizar Cuenta" : "Registrar Cuenta"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
