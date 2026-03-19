"use client";

import MissingPrerequisites from "../../products/components/MissingPrerequisites";
import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { Loader } from "../../../components/Loader";
import { UserIcon, MapPinIcon } from "../../../components/Icons";
import { User } from "../interfaces/user.interface";
import { useUserForm } from "../hooks/useUserForm";

interface UserFormProps {
  onSuccess: () => void;
  defaultValues?: User;
}

export default function UserForm({ onSuccess, defaultValues }: UserFormProps) {
  const {
    form,
    formKey,
    isEditing,
    isPending,
    isLoadingData,
    branches,
    activeRoles,
    missingItems,
    getError,
    clearFieldErrors,
    validateField,
    toggleArrayValue,
    isArrayValueChecked,
    handleDefaultBranchChange,
    handleReset,
    handleFormSubmit,
  } = useUserForm({
    onSuccess,
    userToEdit: defaultValues,
  });

  if (isLoadingData) {
    return (
      <div className="py-10">
        <Loader title="Cargando formulario" message="Preparando sucursales y roles..." />
      </div>
    );
  }

  if (missingItems.length > 0) {
    return <MissingPrerequisites items={missingItems} />;
  }

  return (
    <form key={formKey} onSubmit={handleFormSubmit}>
      <fieldset disabled={isPending} className={`space-y-8 transition-opacity duration-200 ${isPending ? "opacity-60" : ""}`}>
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información Personal
              </h3>
              <p className="text-xs text-slate-500">Datos básicos del usuario</p>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <form.Field name="username">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("username");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("username", field.state.value);
                    }}
                    label="Nombre de Usuario"
                    placeholder="usuario123"
                    className="text-2xl font-bold"
                    variant="ghost"
                    error={getError("username")}
                  />
                )}
              </form.Field>

              <form.Field name="email">
                {(field) => (
                  <FormInput
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
                    label="Email"
                    type="email"
                    placeholder="usuario@empresa.com"
                    error={getError("email")}
                  />
                )}
              </form.Field>

              <form.Field name="first_name">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("first_name");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("first_name", field.state.value);
                    }}
                    label="Nombre"
                    placeholder="Juan"
                    error={getError("first_name")}
                  />
                )}
              </form.Field>

              <form.Field name="last_name">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("last_name");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("last_name", field.state.value);
                    }}
                    label="Apellido"
                    placeholder="Pérez"
                    error={getError("last_name")}
                  />
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <FormInput
                    name={field.name}
                    value={field.state.value}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      clearFieldErrors("password");
                    }}
                    onBlur={() => {
                      field.handleBlur();
                      validateField("password", field.state.value);
                    }}
                    label="Contraseña"
                    type="password"
                    placeholder="********"
                    error={getError("password")}
                  />
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <MapPinIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Sucursales
              </h3>
              <p className="text-xs text-slate-500">Asignación y permisos de acceso</p>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <form.Field name="sucursal_default">
              {(field) => (
                <FormSelect
                  name={field.name}
                  value={String(field.state.value)}
                  onChange={(event) => {
                    handleDefaultBranchChange(Number(event.target.value));
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    validateField("sucursal_default", field.state.value);
                  }}
                  label="Sucursal Principal"
                  error={getError("sucursal_default")}
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      {branch.nombre}
                    </option>
                  ))}
                </FormSelect>
              )}
            </form.Field>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 block">
                Roles
              </label>
              <form.Field name="roles">
                {(field) => (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeRoles.map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-sky-500 dark:hover:border-sky-500 cursor-pointer transition-colors bg-slate-50/50 dark:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          value={role.id}
                          checked={isArrayValueChecked(field.state.value, role.id)}
                          onChange={(event) => {
                            const next = toggleArrayValue(field.state.value, role.id, event.target.checked);
                            field.handleChange(next);
                            clearFieldErrors("roles");
                            validateField("roles", next);
                          }}
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                        />
                        <div className="space-y-0.5">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {role.nombre}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </form.Field>
              {getError("roles") && (
                <p className="text-xs text-red-600 mt-1">{getError("roles")?.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 block">
                Acceso a Sucursales
              </label>
              <form.Field name="sucursales">
                {(field) => (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {branches.map((branch) => (
                      <label
                        key={branch.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-sky-500 dark:hover:border-sky-500 cursor-pointer transition-colors bg-slate-50/50 dark:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          value={branch.id}
                          checked={isArrayValueChecked(field.state.value, branch.id)}
                          onChange={(event) => {
                            const next = toggleArrayValue(field.state.value, branch.id, event.target.checked);
                            field.handleChange(next);
                            clearFieldErrors("sucursales");
                            validateField("sucursales", next);
                          }}
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {branch.nombre}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </form.Field>
              {getError("sucursales") && (
                <p className="text-xs text-red-600 mt-1">{getError("sucursales")?.message}</p>
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel={isEditing ? "Actualizando..." : "Registrando..."}
          >
            {isEditing ? "Actualizar Usuario" : "Registrar Usuario"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
