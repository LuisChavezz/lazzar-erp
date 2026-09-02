"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import {
  BancosIcon,
  BuildingIcon,
  HeartIcon,
  InfoIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@/src/components/Icons";
import { ESTADO_CIVIL_OPTIONS, SEXO_OPTIONS } from "../constants/employeeChoices";
import { Employee } from "../interfaces/employee.interface";
import { useEmployeeForm } from "../hooks/useEmployeeForm";
import { FormSection } from "./FormSection";

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
    branches,
    isLoadingBranches,
    departments,
    isLoadingDepartments,
    positions,
    isLoadingPositions,
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
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <FormSection
          title="Datos Personales"
          subtitle="Identidad y contacto del empleado"
          icon={UserIcon}
        >
          <div className="group/field md:col-span-2">
            <form.Field name="nombre">
              {(field) => (
                <FormInput
                  label="Nombre(s)"
                  placeholder="Ej. Juan Carlos"
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
            <form.Field name="apellido_paterno">
              {(field) => (
                <FormInput
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
        </FormSection>

        <FormSection
          title="Identificación Fiscal y Legal"
          subtitle="CURP, RFC y claves de seguridad social"
          icon={ShieldCheckIcon}
        >
          <div className="group/field">
            <form.Field name="curp">
              {(field) => (
                <FormInput
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
        </FormSection>

        <FormSection title="Domicilio" subtitle="Dirección particular del empleado" icon={MapPinIcon}>
          <div className="group/field md:col-span-2">
            <form.Field name="calle">
              {(field) => (
                <FormInput
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
        </FormSection>

        <FormSection
          title="Datos Laborales"
          subtitle="Adscripción, puesto y fechas de la relación"
          icon={BuildingIcon}
        >
          <div className="group/field">
            <form.Field name="numero_empleado">
              {(field) => (
                <FormInput
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

          <div className="group/field">
            <form.Field name="sucursal">
              {(field) => (
                <FormSelect
                  label="Sucursal"
                  name={field.name}
                  value={String(field.state.value)}
                  onChange={(event) => {
                    field.handleChange(Number(event.target.value));
                    clearFieldErrors("sucursal");
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("sucursal", field.state.value);
                  }}
                  error={getError("sucursal")}
                >
                  <option value="0" disabled>
                    {isLoadingBranches ? "Cargando sucursales..." : "Seleccionar..."}
                  </option>
                  {branches.map((branch) => (
                    <option
                      key={branch.id}
                      value={branch.id}
                      className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                    >
                      {branch.nombre}
                    </option>
                  ))}
                </FormSelect>
              )}
            </form.Field>
          </div>

          <div className="group/field">
            <form.Field name="departamento">
              {(field) => (
                <FormSelect
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
                    {isLoadingDepartments ? "Cargando departamentos..." : "Seleccionar..."}
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
                    {isLoadingPositions ? "Cargando puestos..." : "Seleccionar..."}
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
          </div>

          <div className="group/field">
            <form.Field name="fecha_ingreso">
              {(field) => (
                <FormInput
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
        </FormSection>

        <FormSection
          title="Datos Bancarios"
          subtitle="Cuenta donde se deposita la nómina"
          icon={BancosIcon}
        >
          <div className="group/field">
            <form.Field name="banco">
              {(field) => (
                <FormInput
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
        </FormSection>

        <FormSection
          title="Contacto de Emergencia y Salud"
          subtitle="A quién avisar y qué tener en cuenta"
          icon={HeartIcon}
        >
          <div className="group/field">
            <form.Field name="nombre_emergencia">
              {(field) => (
                <FormInput
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

          <div className="group/field md:col-span-2">
            <form.Field name="alergias">
              {(field) => (
                <FormTextarea
                  label="Alergias"
                  placeholder="Opcional"
                  rows={3}
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

          <div className="group/field md:col-span-2">
            <form.Field name="enfermedades_cronicas">
              {(field) => (
                <FormTextarea
                  label="Enfermedades Crónicas"
                  placeholder="Opcional"
                  rows={3}
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
        </FormSection>

        <FormSection title="Otros" subtitle="Fotografía y notas internas" icon={InfoIcon}>
          <div className="group/field md:col-span-2">
            <form.Field name="foto_url">
              {(field) => (
                <FormInput
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

          <div className="group/field md:col-span-2">
            <form.Field name="observaciones">
              {(field) => (
                <FormTextarea
                  label="Observaciones"
                  placeholder="Opcional"
                  rows={4}
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
        </FormSection>

        <div className="flex justify-end gap-3 pb-8 mt-8">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Guardando...">
            {employeeToEdit ? "Actualizar Empleado" : "Registrar Empleado"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
