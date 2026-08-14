"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSelect } from "@/src/components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { BuildingIcon, UserIcon } from "@/src/components/Icons";
import { Employee } from "../interfaces/employee.interface";
import { useEmployeeForm } from "../hooks/useEmployeeForm";

interface EmployeeFormProps {
  onSuccess: () => void;
  employeeToEdit?: Employee | null;
}

const sectionClassName =
  "bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8";

export default function EmployeeForm({ onSuccess, employeeToEdit }: EmployeeFormProps) {
  const {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
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

  return (
    <form ref={formRef} key={formKey} onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        {/* ── Datos personales ──────────────────────────────────────────── */}
        <section className={sectionClassName}>
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Datos Personales
              </h3>
              <p className="text-xs text-slate-500">Identidad y contacto del empleado</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

              <div className="group/field">
                <form.Field name="curp">
                  {(field) => (
                    <FormInput
                      label="CURP"
                      placeholder="Opcional"
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
                      placeholder="Opcional"
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
            </div>
          </div>
        </section>

        {/* ── Datos laborales ───────────────────────────────────────────── */}
        <section className={sectionClassName}>
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <BuildingIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Datos Laborales
              </h3>
              <p className="text-xs text-slate-500">Adscripción, puesto y fechas de la relación</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

              {/* La baja solo se captura editando: un alta nace activa. */}
              {isEditing && (
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
            </div>
          </div>
        </section>

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
