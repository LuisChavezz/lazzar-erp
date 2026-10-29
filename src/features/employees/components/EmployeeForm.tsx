"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { FormSection } from "@/src/components/FormSection";
import { COMPACT_FIELD_CLS, READ_ONLY_INPUT_CLS } from "@/src/constants/formStyles";
import { WorkspaceBranchNotice } from "@/src/features/workspace/components/WorkspaceBranchNotice";
import { ESTADO_CIVIL_OPTIONS, SEXO_OPTIONS } from "../constants/employeeChoices";
import { Employee } from "../interfaces/employee.interface";
import { EMPLOYEE_SUCURSAL_DOCUMENT, useEmployeeForm } from "../hooks/useEmployeeForm";

/** Rejilla de cada sección: campos cortos de tres en tres. */
const SECTION_GRID_CLS = "grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3";

interface EmployeeFormProps {
  onSuccess: () => void;
  employeeToEdit?: Employee | null;
}

export default function EmployeeForm({ onSuccess, employeeToEdit }: EmployeeFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    sucursalLabel,
    isSucursalMissing,
    departments,
    isLoadingDepartments,
    isErrorDepartments,
    positions,
    isLoadingPositions,
    isErrorPositions,
    shifts,
    isLoadingShifts,
    isErrorShifts,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  } = useEmployeeForm({
    onSuccess,
    employeeToEdit,
  });

  // `noValidate` apaga la validación nativa del navegador, como ya hace
  // QuoteForm. Sin ella, un `type="email"` o `type="url"` mal formado corta el
  // submit ANTES de que corra el schema: el usuario vería el globo del
  // navegador (en su idioma) en vez del mensaje en español, y no se dispararía
  // el scroll al primer campo inválido. Zod es el único validador.
  return (
    <form
      ref={formRef}
      key={formKey}
      onSubmit={handleFormSubmit}
      noValidate
      className="w-full"
    >
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">
        {/* Alta sin sucursal válida en el workspace: aviso persistente y guardado bloqueado. */}
        {!isEditing && <WorkspaceBranchNotice documento={EMPLOYEE_SUCURSAL_DOCUMENT} />}
        <FormSection title="Datos Personales" description="Identidad y contacto del empleado">
          <div className={SECTION_GRID_CLS}>
          <div className="group/field">
            <form.Field name="nombre">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Nombre(s)"
                  placeholder="Ej. Juan Carlos"
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
            <form.Field name="apellido_paterno">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Apellido Paterno"
                  placeholder="Ej. Pérez"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("apellido_paterno");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("apellido_paterno", field.state.value);
                  }}
                  error={getError("apellido_paterno")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="apellido_materno">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Apellido Materno"
                  placeholder="Opcional"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("apellido_materno");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("apellido_materno", field.state.value);
                  }}
                  error={getError("apellido_materno")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="fecha_nacimiento">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Fecha de Nacimiento"
                  type="date"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("fecha_nacimiento");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("fecha_nacimiento", field.state.value);
                  }}
                  error={getError("fecha_nacimiento")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="sexo">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
                  label="Sexo"
                  name={field.name}
                  value={field.state.value}
                  options={SEXO_OPTIONS}
                  onChange={(event) => {
                    field.handleChange(event.target.value as typeof field.state.value);
                    clearFieldErrors("sexo");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("sexo", field.state.value);
                  }}
                  error={getError("sexo")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="estado_civil">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
                  label="Estado Civil"
                  name={field.name}
                  value={field.state.value}
                  options={ESTADO_CIVIL_OPTIONS}
                  onChange={(event) => {
                    field.handleChange(event.target.value as typeof field.state.value);
                    clearFieldErrors("estado_civil");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("estado_civil", field.state.value);
                  }}
                  error={getError("estado_civil")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="nacionalidad">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Nacionalidad"
                  placeholder="Ej. MEXICANA"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("nacionalidad");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("nacionalidad", field.state.value);
                  }}
                  error={getError("nacionalidad")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="lugar_nacimiento">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Lugar de Nacimiento"
                  placeholder="Opcional"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("lugar_nacimiento");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("lugar_nacimiento", field.state.value);
                  }}
                  error={getError("lugar_nacimiento")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="telefono">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Teléfono"
                  placeholder="Ej. 5512345678"
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

          <div className="group/field md:col-span-2">
            <form.Field name="email">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Correo Electrónico"
                  type="email"
                  placeholder="empleado@empresa.com"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("email");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("email", field.state.value);
                  }}
                  error={getError("email")}
                />
              )}
            </form.Field>
          </div>
          </div>
        </FormSection>

        <FormSection title="Identificación Fiscal y Legal" description="CURP, RFC y claves de seguridad social">
          <div className={SECTION_GRID_CLS}>
          <div className="group/field">
            <form.Field name="curp">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="CURP"
                  placeholder="18 caracteres"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("curp");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("curp", field.state.value);
                  }}
                  error={getError("curp")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="rfc">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="RFC"
                  placeholder="12 o 13 caracteres"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("rfc");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("rfc", field.state.value);
                  }}
                  error={getError("rfc")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="nss">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="NSS"
                  placeholder="11 dígitos"
                  inputMode="numeric"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("nss");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("nss", field.state.value);
                  }}
                  error={getError("nss")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="infonavit">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="INFONAVIT"
                  placeholder="Opcional"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("infonavit");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("infonavit", field.state.value);
                  }}
                  error={getError("infonavit")}
                />
              )}
            </form.Field>
          </div>
          </div>
        </FormSection>

        <FormSection title="Domicilio" description="Dirección particular del empleado">
          <div className={SECTION_GRID_CLS}>
          <div className="group/field md:col-span-2">
            <form.Field name="calle">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Calle"
                  placeholder="Opcional"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("calle");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("calle", field.state.value);
                  }}
                  error={getError("calle")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="numero_exterior">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Número Exterior"
                  placeholder="Opcional"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("numero_exterior");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("numero_exterior", field.state.value);
                  }}
                  error={getError("numero_exterior")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="numero_interior">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Número Interior"
                  placeholder="Opcional"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("numero_interior");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("numero_interior", field.state.value);
                  }}
                  error={getError("numero_interior")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="colonia">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Colonia"
                  placeholder="Opcional"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("colonia");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("colonia", field.state.value);
                  }}
                  error={getError("colonia")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="codigo_postal">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Código Postal"
                  placeholder="5 dígitos"
                  inputMode="numeric"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("codigo_postal");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("codigo_postal", field.state.value);
                  }}
                  error={getError("codigo_postal")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="ciudad">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Ciudad"
                  placeholder="Opcional"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("ciudad");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("ciudad", field.state.value);
                  }}
                  error={getError("ciudad")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="estado">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Estado (entidad federativa)"
                  placeholder="Opcional"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
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
          </div>
        </FormSection>

        <FormSection title="Datos Laborales" description="Adscripción, puesto y fechas de la relación">
          <div className={SECTION_GRID_CLS}>
          <div className="group/field">
            <form.Field name="numero_empleado">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Número de Empleado"
                  placeholder="Ej. EMP-001"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("numero_empleado");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("numero_empleado", field.state.value);
                  }}
                  error={getError("numero_empleado")}
                />
              )}
            </form.Field>
          </div>

          {/*
            La sucursal no se captura: al crear es la del workspace y al editar
            se conserva la del empleado (ver `useEmployeeForm`). Sin sucursal
            válida el aviso de arriba explica por qué no se puede guardar.
          */}
          <div className="group/field">
            <FormInput
              id="empleado-sucursal"
              label="Sucursal"
              value={sucursalLabel}
              placeholder="Sin sucursal"
              readOnly
              tabIndex={-1}
              className={`${COMPACT_FIELD_CLS} ${READ_ONLY_INPUT_CLS}`}
              error={getError("sucursal")}
            />
          </div>

          <div className="group/field">
            <form.Field name="departamento">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
                  label="Departamento"
                  name={field.name}
                  value={String(field.state.value)}
                  onChange={(event) => {
                    field.handleChange(Number(event.target.value));
                    clearFieldErrors("departamento");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("departamento", field.state.value);
                  }}
                  error={getError("departamento")}
                >
                  <option value="0" disabled>
                    {isLoadingDepartments
                      ? "Cargando departamentos..."
                      : isErrorDepartments
                        ? "No se pudo cargar el catálogo de departamentos"
                        : "Seleccionar..."}
                  </option>
                  {departments.map((department) => (
                    <option
                      key={department.id_departamento}
                      value={department.id_departamento}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {`${department.codigo} — ${department.nombre}`}
                    </option>
                  ))}
                </FormSelect>
              )}
            </form.Field>
            {isErrorDepartments && (
              <p className="mt-1 ml-1 text-[11px] text-red-600 dark:text-red-400">
                No se pudo cargar el catálogo de departamentos. Revisa tu conexión e intenta abrir
                el diálogo de nuevo.
              </p>
            )}
          </div>

          {/*
            El select lista TODOS los puestos, sin filtrar por el
            departamento elegido: la relación Puesto → Departamento es
            indirecta (Puesto → Área → Departamento) y `Puesto.area` es
            opcional, así que filtrar escondería los puestos sin área.
          */}
          <div className="group/field">
            <form.Field name="puesto">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
                  label="Puesto"
                  name={field.name}
                  value={String(field.state.value)}
                  onChange={(event) => {
                    field.handleChange(Number(event.target.value));
                    clearFieldErrors("puesto");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("puesto", field.state.value);
                  }}
                  error={getError("puesto")}
                >
                  <option value="0" disabled>
                    {isLoadingPositions
                      ? "Cargando puestos..."
                      : isErrorPositions
                        ? "No se pudo cargar el catálogo de puestos"
                        : "Seleccionar..."}
                  </option>
                  {positions.map((position) => (
                    <option
                      key={position.id}
                      value={position.id}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {position.nombre}
                    </option>
                  ))}
                </FormSelect>
              )}
            </form.Field>
            {isErrorPositions && (
              <p className="mt-1 ml-1 text-[11px] text-red-600 dark:text-red-400">
                No se pudo cargar el catálogo de puestos. Revisa tu conexión e intenta abrir el
                diálogo de nuevo.
              </p>
            )}
          </div>

          {/*
            `turno` es opcional: la opción 0 NO va `disabled` —a diferencia de
            los FK obligatorios— porque "Sin turno" es una elección válida.
            Por eso mismo, si el catálogo NO cargó, su texto cambia: "Sin
            turno" leído ahí haría pasar una falla de carga por una elección.
          */}
          <div className="group/field">
            <form.Field name="turno">
              {(field) => (
                <FormSelect
                  className={COMPACT_FIELD_CLS}
                  label="Turno"
                  name={field.name}
                  value={String(field.state.value)}
                  onChange={(event) => {
                    field.handleChange(Number(event.target.value));
                    clearFieldErrors("turno");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("turno", field.state.value);
                  }}
                  error={getError("turno")}
                >
                  <option value="0">
                    {isLoadingShifts
                      ? "Cargando turnos..."
                      : isErrorShifts
                        ? "No se pudo cargar el catálogo de turnos"
                        : "Sin turno asignado"}
                  </option>
                  {shifts.map((shift) => (
                    <option
                      key={shift.id}
                      value={shift.id}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {shift.nombre}
                    </option>
                  ))}
                </FormSelect>
              )}
            </form.Field>
            {isErrorShifts && (
              <p className="mt-1 ml-1 text-[11px] text-red-600 dark:text-red-400">
                No se pudo cargar el catálogo de turnos. Revisa tu conexión e intenta abrir el
                diálogo de nuevo.
              </p>
            )}
          </div>

          <div className="group/field">
            <form.Field name="fecha_ingreso">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Fecha de Ingreso"
                  type="date"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("fecha_ingreso");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("fecha_ingreso", field.state.value);
                  }}
                  error={getError("fecha_ingreso")}
                />
              )}
            </form.Field>
          </div>

          {/*
            La baja solo se captura editando a un empleado YA inactivo: un
            alta nace activa, y sobre uno activo la fecha no aplica todavía.
            El backend la sella al desactivar; aquí queda editable para
            corregirla.
          */}
          {employeeToEdit?.activo === false && (
            <div className="group/field">
              <form.Field name="fecha_baja">
                {(field) => (
                  <FormInput
                    className={COMPACT_FIELD_CLS}
                    label="Fecha de Baja"
                    type="date"
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("fecha_baja");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("fecha_baja", field.state.value);
                    }}
                    error={getError("fecha_baja")}
                  />
                )}
              </form.Field>
            </div>
          )}
          </div>
        </FormSection>

        <FormSection title="Datos Bancarios" description="Cuenta donde se deposita la nómina">
          <div className={SECTION_GRID_CLS}>
          <div className="group/field">
            <form.Field name="banco">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Banco"
                  placeholder="Opcional"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("banco");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("banco", field.state.value);
                  }}
                  error={getError("banco")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="cuenta_bancaria">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Cuenta Bancaria"
                  placeholder="Opcional"
                  inputMode="numeric"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("cuenta_bancaria");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("cuenta_bancaria", field.state.value);
                  }}
                  error={getError("cuenta_bancaria")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="clabe">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="CLABE"
                  placeholder="18 dígitos"
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
            <form.Field name="moneda_pago">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Moneda de Pago"
                  placeholder="Ej. MXN"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("moneda_pago");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("moneda_pago", field.state.value);
                  }}
                  error={getError("moneda_pago")}
                />
              )}
            </form.Field>
          </div>
          </div>
        </FormSection>

        <FormSection title="Contacto de Emergencia y Salud" description="A quién avisar y qué tener en cuenta">
          <div className={SECTION_GRID_CLS}>
          <div className="group/field">
            <form.Field name="nombre_emergencia">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Nombre del Contacto"
                  placeholder="Opcional"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("nombre_emergencia");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("nombre_emergencia", field.state.value);
                  }}
                  error={getError("nombre_emergencia")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="parentesco_emergencia">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Parentesco"
                  placeholder="Ej. MADRE"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("parentesco_emergencia");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("parentesco_emergencia", field.state.value);
                  }}
                  error={getError("parentesco_emergencia")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="telefono_emergencia">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Teléfono de Emergencia"
                  placeholder="Ej. 5512345678"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("telefono_emergencia");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("telefono_emergencia", field.state.value);
                  }}
                  error={getError("telefono_emergencia")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="email_emergencia">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Correo de Emergencia"
                  type="email"
                  placeholder="contacto@ejemplo.com"
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("email_emergencia");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("email_emergencia", field.state.value);
                  }}
                  error={getError("email_emergencia")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="tipo_sangre">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="Tipo de Sangre"
                  placeholder="Ej. O+"
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("tipo_sangre");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("tipo_sangre", field.state.value);
                  }}
                  error={getError("tipo_sangre")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field md:col-span-3">
            <form.Field name="alergias">
              {(field) => (
                <FormTextarea
                  className={COMPACT_FIELD_CLS}
                  label="Alergias"
                  placeholder="Opcional"
                  rows={2}
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("alergias");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("alergias", field.state.value);
                  }}
                  error={getError("alergias")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field md:col-span-3">
            <form.Field name="enfermedades_cronicas">
              {(field) => (
                <FormTextarea
                  className={COMPACT_FIELD_CLS}
                  label="Enfermedades Crónicas"
                  placeholder="Opcional"
                  rows={2}
                  forceUppercase
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("enfermedades_cronicas");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("enfermedades_cronicas", field.state.value);
                  }}
                  error={getError("enfermedades_cronicas")}
                />
              )}
            </form.Field>
          </div>
          </div>
        </FormSection>

        <FormSection title="Otros" description="Fotografía y notas internas">
          <div className={SECTION_GRID_CLS}>
          <div className="group/field md:col-span-3">
            <form.Field name="foto_url">
              {(field) => (
                <FormInput
                  className={COMPACT_FIELD_CLS}
                  label="URL de la Fotografía"
                  type="url"
                  placeholder="https://..."
                  name={field.name}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    clearFieldErrors("foto_url");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("foto_url", field.state.value);
                  }}
                  error={getError("foto_url")}
                />
              )}
            </form.Field>
          </div>

          <div className="group/field md:col-span-3">
            <form.Field name="observaciones">
              {(field) => (
                <FormTextarea
                  className={COMPACT_FIELD_CLS}
                  label="Observaciones"
                  placeholder="Opcional"
                  rows={2}
                  forceUppercase
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
          <FormSubmitButton
            isPending={isPending}
            disabled={isSucursalMissing}
            loadingLabel="Guardando..."
          >
            {employeeToEdit ? "Actualizar Empleado" : "Registrar Empleado"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
