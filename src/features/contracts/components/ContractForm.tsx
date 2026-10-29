"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { FormSection } from "@/src/components/FormSection";
import { COMPACT_FIELD_CLS } from "@/src/constants/formStyles";
import { Contract } from "../interfaces/contract.interface";
import { ESTADO_CONTRATO_OPTIONS, TIPO_CONTRATO_OPTIONS } from "../constants/contractChoices";
import { useContractForm } from "../hooks/useContractForm";

/**
 * Dos bloques: los términos del contrato (campos cortos de tres en tres) y su
 * documentación (dos textos largos lado a lado).
 */
const CONTRACT_GRID_CLS = "grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3";
const DOCUMENTATION_GRID_CLS = "grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3";

interface ContractFormProps {
  onSuccess: () => void;
  contractToEdit?: Contract | null;
}

export default function ContractForm({ onSuccess, contractToEdit }: ContractFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    employeeOptions,
    isLoadingEmployees,
    isErrorEmployees,
    getError,
    clearFieldErrors,
    revalidateFechaRange,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useContractForm({
    onSuccess,
    contractToEdit,
  });

  // `empleado` es obligatorio y su única fuente es el catálogo de empleados
  // activos: sin ellos el select no ofrece nada y "El empleado es requerido"
  // sonaría a descuido del usuario en vez de a un catálogo vacío.
  //
  // Un catálogo caído NO se pinta como catálogo vacío (mismo criterio que
  // `RegisterAccountPayableDialog`): si la petición falló, `employees` también
  // queda en `[]`, y decir "da de alta uno" mandaría a crear empleados que ya
  // existen. De ahí que "vacío" exija una carga EXITOSA.
  const hasNoEmployees =
    !isLoadingEmployees && !isErrorEmployees && employeeOptions.length === 0;

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">
        <FormSection title="Contrato" description="Empleado, tipo, estado, vigencia y salario">
          <div className={CONTRACT_GRID_CLS}>
          {/*
            `empleado` es OBLIGATORIO y además es por donde el backend
            resuelve la empresa, así que el formulario no captura `empresa`
            en ninguna parte.
          */}
          <div className="group/field md:col-span-3">
            <form.Field name="empleado">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
                  label="Empleado"
                  name={field.name}
                  value={String(field.state.value)}
                  onChange={(event) => {
                    field.handleChange(Number(event.target.value));
                    clearFieldErrors("empleado");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("empleado", field.state.value);
                  }}
                  error={getError("empleado")}
                >
                  <option value="0" disabled>
                    {isLoadingEmployees
                      ? "Cargando empleados..."
                      : isErrorEmployees
                        ? "No se pudo cargar el catálogo de empleados"
                        : hasNoEmployees
                          ? "No hay empleados activos"
                          : "Seleccionar..."}
                  </option>
                  {employeeOptions.map((employee) => (
                    <option
                      key={employee.id}
                      value={employee.id}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {employee.label}
                    </option>
                  ))}
                </FormSelect>
              )}
            </form.Field>
            {isErrorEmployees && (
              <p className="mt-1 ml-1 text-[11px] text-red-600 dark:text-red-400">
                No se pudo cargar el catálogo de empleados. Revisa tu conexión e intenta
                abrir el diálogo de nuevo.
              </p>
            )}
            {hasNoEmployees && (
              <p className="mt-1 ml-1 text-[11px] text-amber-600 dark:text-amber-400">
                No hay empleados activos. Da de alta uno en Capital Humano → Empleados antes
                de registrar contratos.
              </p>
            )}
          </div>

          {/* `tipo` y `estado` siempre viajan: sin opción vacía. */}
          <div className="group/field">
            <form.Field name="tipo">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
                  label="Tipo de Contrato"
                  name={field.name}
                  value={field.state.value}
                  options={TIPO_CONTRATO_OPTIONS}
                  onChange={(event) => {
                    field.handleChange(event.target.value as typeof field.state.value);
                    clearFieldErrors("tipo");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("tipo", field.state.value);
                  }}
                  error={getError("tipo")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="estado">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
                  label="Estado"
                  name={field.name}
                  value={field.state.value}
                  options={ESTADO_CONTRATO_OPTIONS}
                  onChange={(event) => {
                    field.handleChange(event.target.value as typeof field.state.value);
                    clearFieldErrors("estado");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("estado", field.state.value);
                  }}
                  error={getError("estado")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="salario">
              {(field) => (
                <FormInput
                  label="Salario"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("salario");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("salario", field.state.value);
                  }}
                  error={getError("salario")}
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="fecha_inicio">
              {(field) => (
                <FormInput
                  label="Fecha de Inicio"
                  type="date"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("fecha_inicio");
                    // El error de la regla cruzada vive bajo `fecha_fin`:
                    // si este cambio la satisface, hay que quitarlo de ahí.
                    revalidateFechaRange(
                      event.target.value,
                      form.getFieldValue("fecha_fin")
                    );
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("fecha_inicio", field.state.value);
                  }}
                  error={getError("fecha_inicio")}
                />
              )}
            </form.Field>
          </div>

          {/* Opcional: vacío viaja como null (contrato sin fecha de término). */}
          <div className="group/field">
            <form.Field name="fecha_fin">
              {(field) => (
                <FormInput
                  label="Fecha de Fin (opcional)"
                  type="date"
                  className={`${COMPACT_FIELD_CLS} dark:scheme-dark`}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("fecha_fin");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("fecha_fin", field.state.value);
                  }}
                  error={getError("fecha_fin")}
                />
              )}
            </form.Field>
          </div>
          </div>
        </FormSection>

        <FormSection title="Documentación" description="Archivo, prestaciones y observaciones">
          <div className={DOCUMENTATION_GRID_CLS}>
          {/* Texto libre: el backend no sube archivos ni valida la URL. */}
          <div className="group/field md:col-span-2">
            <form.Field name="archivo_url">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Archivo (URL o referencia)"
                  placeholder="https://... (opcional)"
                  maxLength={255}
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("archivo_url");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("archivo_url", field.state.value);
                  }}
                  error={getError("archivo_url")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="prestaciones">
              {(field) => (
                <FormTextarea
                  className={COMPACT_FIELD_CLS}
                  label="Prestaciones"
                  rows={2}
                  placeholder="Prestaciones pactadas en el contrato (opcional)"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("prestaciones");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("prestaciones", field.state.value);
                  }}
                  error={getError("prestaciones")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="observaciones">
              {(field) => (
                <FormTextarea
                  className={COMPACT_FIELD_CLS}
                  label="Observaciones"
                  rows={2}
                  placeholder="Notas adicionales (opcional)"
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
        </FormSection>

        <div className="flex justify-end gap-3 pt-1">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {contractToEdit ? "Actualizar Contrato" : "Registrar Contrato"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
