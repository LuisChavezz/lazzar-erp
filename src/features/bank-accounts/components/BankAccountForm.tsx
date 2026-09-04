"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { BancosIcon } from "@/src/components/Icons";
import { CuentaBancaria } from "../interfaces/bank-account.interface";
import { useBankAccountForm } from "../hooks/useBankAccountForm";

interface BankAccountFormProps {
  onSuccess: () => void;
  accountToEdit?: CuentaBancaria | null;
}

export default function BankAccountForm({
  onSuccess,
  accountToEdit,
}: BankAccountFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    banks,
    isLoadingBanks,
    currencies,
    isLoadingCurrencies,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useBankAccountForm({
    onSuccess,
    accountToEdit,
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
              <p className="text-xs text-slate-500">
                Datos de la cuenta, su banco y su moneda
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="alias">
                  {(field) => (
                    <FormInput
                      label="Alias de la Cuenta"
                      placeholder="Ej. Cuenta Nómina BBVA"
                      forceUppercase
                      variant="ghost"
                      className="text-3xl font-bold"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("alias");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("alias", field.state.value);
                      }}
                      error={getError("alias")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="banco">
                  {(field) => (
                    <FormSelect
                      label="Banco"
                      name={field.name}
                      value={String(field.state.value)}
                      onChange={(event) => {
                        field.handleChange(Number(event.target.value));
                        clearFieldErrors("banco");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("banco", field.state.value);
                      }}
                      error={getError("banco")}
                    >
                      <option value="0" disabled>
                        {isLoadingBanks ? "Cargando bancos..." : "Seleccionar..."}
                      </option>
                      {banks.map((banco) => {
                        // `nombre` y `codigo` son nullable por separado. El
                        // respaldo se resuelve ANTES de componer la etiqueta:
                        // colgarlo solo de la rama sin código dejaba "012 — "
                        // con el guion colgando para un banco con código y sin
                        // nombre. Mismo respaldo que usan las opciones del
                        // filtro por banco en `BankAccountList`.
                        const nombre = banco.nombre ?? `Banco #${banco.id}`;
                        return (
                          <option
                            key={banco.id}
                            value={banco.id}
                            className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                          >
                            {banco.codigo ? `${banco.codigo} — ${nombre}` : nombre}
                          </option>
                        );
                      })}
                    </FormSelect>
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="moneda">
                  {(field) => (
                    <FormSelect
                      label="Moneda"
                      name={field.name}
                      value={String(field.state.value)}
                      onChange={(event) => {
                        field.handleChange(Number(event.target.value));
                        clearFieldErrors("moneda");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("moneda", field.state.value);
                      }}
                      error={getError("moneda")}
                    >
                      <option value="0" disabled>
                        {isLoadingCurrencies ? "Cargando monedas..." : "Seleccionar..."}
                      </option>
                      {currencies.map((moneda) => (
                        <option
                          key={moneda.id}
                          value={moneda.id}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {`${moneda.codigo_iso} — ${moneda.nombre}`}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="titular">
                  {(field) => (
                    <FormInput
                      label="Titular"
                      placeholder="Ej. Empresa Principal SA de CV (opcional)"
                      forceUppercase
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("titular");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("titular", field.state.value);
                      }}
                      error={getError("titular")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="sucursal_bancaria">
                  {(field) => (
                    <FormInput
                      // Sucursal DEL BANCO, texto libre. NO es la sucursal de la
                      // empresa (`nucleo.Sucursal`): el modelo la declara
                      // `CharField`, así que no lleva selector de catálogo.
                      label="Sucursal Bancaria"
                      placeholder="Ej. Sucursal Centro (opcional)"
                      forceUppercase
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("sucursal_bancaria");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("sucursal_bancaria", field.state.value);
                      }}
                      error={getError("sucursal_bancaria")}
                    />
                  )}
                </form.Field>
              </div>

              {/*
                `numero_cuenta` y `clabe` van SIN `forceUppercase`: son
                identificadores numéricos, donde el transform no puede cambiar
                nada y solo agregaría ruido — la convención del proyecto excluye
                los campos numéricos.
              */}
              <div className="group/field">
                <form.Field name="numero_cuenta">
                  {(field) => (
                    <FormInput
                      label="Número de Cuenta"
                      placeholder="Ej. 0123456789"
                      inputMode="numeric"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("numero_cuenta");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("numero_cuenta", field.state.value);
                      }}
                      error={getError("numero_cuenta")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="clabe">
                  {(field) => (
                    <FormInput
                      label="CLABE"
                      placeholder="18 dígitos (opcional)"
                      inputMode="numeric"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("clabe");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("clabe", field.state.value);
                      }}
                      error={getError("clabe")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="numero_cliente">
                  {(field) => (
                    <FormInput
                      label="Número de Cliente"
                      placeholder="Opcional"
                      forceUppercase
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("numero_cliente");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("numero_cliente", field.state.value);
                      }}
                      error={getError("numero_cliente")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="convenio">
                  {(field) => (
                    <FormInput
                      label="Convenio"
                      placeholder="Opcional"
                      forceUppercase
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("convenio");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("convenio", field.state.value);
                      }}
                      error={getError("convenio")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="fecha_apertura">
                  {(field) => (
                    // `<input type="date">` plano: no hay selector de fechas
                    // compartido en el proyecto. Sin `forceUppercase` — el
                    // transform llama a `setSelectionRange`, que en un input de
                    // tipo date no aplica.
                    <FormInput
                      label="Fecha de Apertura"
                      type="date"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("fecha_apertura");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("fecha_apertura", field.state.value);
                      }}
                      error={getError("fecha_apertura")}
                    />
                  )}
                </form.Field>
              </div>

              {/*
                `saldo_actual` NO se captura: lo mantienen `PagoService` y
                `CobroService` del backend al aplicar documentos. Editarlo a mano
                lo desincronizaría del historial de movimientos, así que solo se
                muestra (listado y resumen), nunca se edita.
              */}

              <div className="group/field md:col-span-2">
                <form.Field name="observaciones">
                  {(field) => (
                    <FormTextarea
                      label="Observaciones"
                      rows={3}
                      placeholder="Notas internas sobre la cuenta (opcional)"
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
            {accountToEdit ? "Actualizar Cuenta" : "Registrar Cuenta"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
