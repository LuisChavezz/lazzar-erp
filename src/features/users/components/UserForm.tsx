"use client";

import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserFormSchema, UserFormValues } from "../schemas/user.schema";
import { useRegisterUser } from "../hooks/useRegisterUser";
import { useUpdateUser } from "../hooks/useUpdateUser";
import { FormInput } from "../../../components/FormInput";
import { FormSelect } from "../../../components/FormSelect";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";
import { UserIcon, MapPinIcon } from "../../../components/Icons";
import { User } from "../interfaces/user.interface";

interface UserFormProps {
  onSuccess: () => void;
  defaultValues?: User;
}

export default function UserForm({ onSuccess, defaultValues }: UserFormProps) {
  const companyId = useWorkspaceStore((state) => state.selectedCompany.id);
  const selectedBranchId = useWorkspaceStore((state) => state.selectedBranch!.id);
  const { branches, isLoading: isLoadingBranches } = useCompanyBranches(companyId);

  const isEditMode = !!defaultValues;

  const initialValues = isEditMode
    ? {
        username: defaultValues.username,
        email: defaultValues.email,
        password: "",
        first_name: defaultValues.first_name,
        last_name: defaultValues.last_name,
        sucursal_default: defaultValues.sucursal_default,
        sucursales: Array.isArray(defaultValues.sucursales)
          ? defaultValues.sucursales.map((id) => id.toString())
          : defaultValues.sucursales
          ? [String(defaultValues.sucursales as unknown as number)]
          : [],
        is_active: defaultValues.is_active,
      }
    : {
        username: "",
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        sucursal_default: selectedBranchId,
        sucursales: [] as string[],
        is_active: true,
      };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(UserFormSchema) as Resolver<UserFormValues>,
    defaultValues: initialValues as unknown as UserFormValues,
  });

  const { mutate: registerUser, isPending: isRegisterPending } = useRegisterUser(setError);
  const { mutate: updateUserMutation, isPending: isUpdatePending } = useUpdateUser(setError);

  const isPending = isRegisterPending || isUpdatePending;

  const onSubmit = (values: UserFormValues) => {
    if (isEditMode && defaultValues) {
      updateUserMutation(
        { id: defaultValues.id, values },
        {
          onSuccess: () => {
            reset(initialValues as unknown as UserFormValues);
            onSuccess();
          },
        }
      );
    } else {
      registerUser(values, {
        onSuccess: () => {
          reset(initialValues as unknown as UserFormValues);
          onSuccess();
        },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <fieldset disabled={isPending} className={`space-y-8 transition-opacity duration-200 ${isPending ? "opacity-60" : ""}`}>
        {/* Información Personal */}
        <section className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none group hover:border-sky-200 dark:hover:border-sky-900 transition-colors duration-300">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Nombre de Usuario"
                placeholder="usuario123"
                {...register("username")}
                error={errors.username}
              />
              
              <FormInput
                label="Email"
                type="email"
                placeholder="usuario@empresa.com"
                {...register("email")}
                error={errors.email}
              />

              <FormInput
                label="Nombre"
                placeholder="Juan"
                {...register("first_name")}
                error={errors.first_name}
              />

              <FormInput
                label="Apellido"
                placeholder="Pérez"
                {...register("last_name")}
                error={errors.last_name}
              />

              <FormInput
                label="Contraseña"
                type="password"
                placeholder="********"
                {...register("password")}
                error={errors.password}
              />
            </div>
          </div>
        </section>

        {/* Configuración de Sucursales */}
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
            {isLoadingBranches ? (
              <p className="text-sm text-slate-500">Cargando sucursales...</p>
            ) : (
              <>
                <FormSelect
                  label="Sucursal Principal"
                  {...register("sucursal_default")}
                  error={errors.sucursal_default}
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                      {branch.nombre}
                    </option>
                  ))}
                </FormSelect>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 block">
                    Acceso a Sucursales
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {branches.map((branch) => (
                      <label
                        key={branch.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-sky-500 dark:hover:border-sky-500 cursor-pointer transition-colors bg-slate-50/50 dark:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          value={branch.id}
                          {...register("sucursales")}
                          className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {branch.nombre}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.sucursales && (
                    <p className="text-xs text-red-600 mt-1">{errors.sucursales.message}</p>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="is_active"
                {...register("is_active")}
                className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
              />
              <label htmlFor="is_active" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                Usuario Activo
              </label>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4">
          <FormCancelButton onClick={() => reset(initialValues as unknown as UserFormValues)} disabled={isPending} />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel={isEditMode ? "Actualizando..." : "Registrando..."}
          >
            {isEditMode ? "Actualizar Usuario" : "Registrar Usuario"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
