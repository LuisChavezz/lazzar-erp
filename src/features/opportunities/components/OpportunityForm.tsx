"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { ClientesIcon, TrendingUpIcon } from "@/src/components/Icons";
import { sanitizeDecimalInput } from "@/src/utils/decimal";
import { CustomerSearchDropdown } from "@/src/features/quotes/components/CustomerSearchDropdown";
import {
  ETAPA_OPORTUNIDAD_OPTIONS,
  OPORTUNIDAD_MAX_LENGTH,
  type EtapaOportunidad,
} from "../constants/opportunityChoices";
import { useOpportunityForm } from "../hooks/useOpportunityForm";
import type { Opportunity } from "../interfaces/opportunity.interface";

interface OpportunityFormProps {
  onSuccess: () => void;
  opportunityToEdit?: Opportunity | null;
}

const SECTION_CLS =
  "bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8";
const SECTION_HEADER_CLS =
  "px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2";
const HINT_CLS = "mt-1 ml-1 text-[11px]";

/**
 * Alta y edición de una oportunidad (mismo formulario). `vendedor` no se
 * captura: lo fija el backend. `estado` tampoco: lo calcula a partir de la
 * etapa y de las cotizaciones.
 */
export default function OpportunityForm({ onSuccess, opportunityToEdit }: OpportunityFormProps) {
  const {
    form,
    formRef,
    isPending,
    isEditing,
    isLost,
    customerOptions,
    customerSearchValue,
    selectedCustomerId,
    isSelectedCustomerInactive,
    isLoadingCustomers,
    isErrorCustomers,
    identificationError,
    setCustomerSearch,
    selectCustomer,
    clearCustomer,
    resetCustomerSearch,
    changeEtapa,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useOpportunityForm({ onSuccess, opportunityToEdit });

  // Falta título, cliente y contacto a la vez. Se pinta junto a los tres: bajo
  // el título y al inicio de "Cliente y contacto".
  // Solo la primera copia lleva `role="alert"`: con las dos, un lector de
  // pantalla anunciaría el mismo aviso dos veces.
  const renderIdentificationNotice = (announce: boolean) =>
    identificationError ? (
      <p
        role={announce ? "alert" : undefined}
        className={`${HINT_CLS} text-red-600 dark:text-red-400`}
      >
        {identificationError}
      </p>
    ) : null;

  return (
    <form ref={formRef} onSubmit={handleFormSubmit} className="w-full" noValidate>
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className={SECTION_CLS}>
          <div className={SECTION_HEADER_CLS}>
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <TrendingUpIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Oportunidad
              </h3>
              <p className="text-xs text-slate-500">Título, monto estimado, etapa y seguimiento</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group/field md:col-span-2">
                <form.Field name="titulo">
                  {(field) => (
                    <FormInput
                      label="Título (opcional)"
                      placeholder="Qué se le quiere vender"
                      forceUppercase
                      maxLength={OPORTUNIDAD_MAX_LENGTH.titulo}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("titulo");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("titulo", field.state.value);
                      }}
                      error={getError("titulo")}
                    />
                  )}
                </form.Field>
                {renderIdentificationNotice(true)}
              </div>

              {/* Sin símbolo de moneda: las oportunidades no tienen moneda. */}
              <div className="group/field">
                <form.Field name="monto_estimado">
                  {(field) => (
                    <FormInput
                      label="Monto estimado"
                      placeholder="0.00"
                      inputMode="decimal"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(sanitizeDecimalInput(event.target.value, 2));
                        clearFieldErrors("monto_estimado");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("monto_estimado", field.state.value);
                      }}
                      error={getError("monto_estimado")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="proximo_contacto">
                  {(field) => (
                    <FormInput
                      label="Próximo contacto (opcional)"
                      type="date"
                      className="dark:scheme-dark"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("proximo_contacto");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("proximo_contacto", field.state.value);
                      }}
                      error={getError("proximo_contacto")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field md:col-span-2">
                <form.Field name="etapa">
                  {(field) => (
                    <FormSelect
                      label="Etapa"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => changeEtapa(event.target.value as EtapaOportunidad)}
                      onBlur={field.handleBlur}
                      error={getError("etapa")}
                    >
                      {ETAPA_OPORTUNIDAD_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                        >
                          {option.label}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                </form.Field>
                <p className={`${HINT_CLS} text-slate-500 dark:text-slate-400`}>
                  &quot;Cotizada&quot; y &quot;Ganada&quot; no se capturan: las marca el sistema
                  cuando la oportunidad tiene una cotización o una cotización autorizada.
                </p>
              </div>

              {/* Solo con la etapa "Perdida": ahí es obligatorio. */}
              {isLost && (
                <div className="group/field md:col-span-2">
                  <form.Field name="motivo_perdida">
                    {(field) => (
                      <FormTextarea
                        label="Motivo de la pérdida"
                        rows={2}
                        placeholder="Por qué se perdió la oportunidad"
                        maxLength={OPORTUNIDAD_MAX_LENGTH.motivo_perdida}
                        name={field.name}
                        value={field.state.value}
                        onChange={(event) => {
                          field.handleChange(event.target.value);
                          clearFieldErrors("motivo_perdida");
                        }}
                        onBlur={() => {
                          field.handleBlur();
                          validateField("motivo_perdida", field.state.value);
                        }}
                        error={getError("motivo_perdida")}
                      />
                    )}
                  </form.Field>
                </div>
              )}

              <div className="group/field md:col-span-2">
                <form.Field name="notas">
                  {(field) => (
                    <FormTextarea
                      label="Notas (opcional)"
                      rows={3}
                      placeholder="Contexto de la oportunidad"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("notas");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("notas")}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </div>
        </section>

        <section className={SECTION_CLS}>
          <div className={SECTION_HEADER_CLS}>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
              <ClientesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Cliente y contacto
              </h3>
              <p className="text-xs text-slate-500">
                Un cliente del catálogo, o solo los datos de contacto si aún no lo es
              </p>
            </div>
          </div>

          <div className="p-8">
            {identificationError && <div className="mb-6">{renderIdentificationNotice(false)}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/*
                Lo tecleado es solo una búsqueda: la selección cambia al elegir
                un cliente o "Sin cliente". Al salir del campo vuelve a mostrar
                el cliente elegido.
              */}
              <div className="md:col-span-2" onBlur={resetCustomerSearch}>
                <CustomerSearchDropdown
                  label="Cliente (opcional)"
                  placeholder={isLoadingCustomers ? "Cargando clientes..." : "Buscar cliente..."}
                  value={customerSearchValue}
                  onValueChange={setCustomerSearch}
                  customers={customerOptions}
                  onSelect={selectCustomer}
                  selectedId={selectedCustomerId}
                  clearOption={{ label: "Sin cliente", onSelect: clearCustomer }}
                  error={getError("cliente")}
                />
                {isErrorCustomers && (
                  <p className={`${HINT_CLS} text-red-600 dark:text-red-400`}>
                    No se pudo cargar el catálogo de clientes. Puedes guardar la oportunidad sin
                    cliente y ligarlo después.
                  </p>
                )}
                {isSelectedCustomerInactive && (
                  <p className={`${HINT_CLS} text-amber-600 dark:text-amber-400`}>
                    Este cliente está inactivo. Se conserva mientras no lo cambies.
                  </p>
                )}
              </div>

              <div className="group/field md:col-span-2">
                <form.Field name="nombre_contacto">
                  {(field) => (
                    <FormInput
                      label="Nombre del contacto (opcional)"
                      placeholder="Con quién se trata"
                      forceUppercase
                      maxLength={OPORTUNIDAD_MAX_LENGTH.nombre_contacto}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("nombre_contacto");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("nombre_contacto", field.state.value);
                      }}
                      error={getError("nombre_contacto")}
                    />
                  )}
                </form.Field>
              </div>

              <div className="group/field">
                <form.Field name="telefono">
                  {(field) => (
                    <FormInput
                      label="Teléfono (opcional)"
                      type="tel"
                      placeholder="Teléfono del contacto"
                      maxLength={OPORTUNIDAD_MAX_LENGTH.telefono}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("telefono");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("telefono", field.state.value);
                      }}
                      error={getError("telefono")}
                    />
                  )}
                </form.Field>
              </div>

              {/* `noValidate` en el form: el formato lo valida el schema, no el navegador. */}
              <div className="group/field">
                <form.Field name="correo">
                  {(field) => (
                    <FormInput
                      label="Correo (opcional)"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      maxLength={OPORTUNIDAD_MAX_LENGTH.correo}
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldErrors("correo");
                      }}
                      onBlur={() => {
                        field.handleBlur();
                        validateField("correo", field.state.value);
                      }}
                      error={getError("correo")}
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
            {isEditing ? "Actualizar Oportunidad" : "Registrar Oportunidad"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
