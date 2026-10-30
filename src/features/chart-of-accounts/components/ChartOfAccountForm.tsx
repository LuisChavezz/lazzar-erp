"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormToggle } from "@/src/components/FormToggle";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
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
 *
 * Formulario de un solo bloque: compacto, sin secciones (ver `DIALOG_WIDTH_FORM`).
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
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          <div className="md:col-span-2">
            <form.Field name="nombre">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Nombre de la Cuenta"
                  placeholder="Ej. Bancos moneda nacional"
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
                  className={COMPACT_FIELD_CLS}
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
                  className={COMPACT_FIELD_CLS}
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
                  className={COMPACT_FIELD_CLS}
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

        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {isEditing ? "Actualizar Cuenta" : "Registrar Cuenta"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
