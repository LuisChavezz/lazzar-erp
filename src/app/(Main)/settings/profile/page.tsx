"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";

type ProfileFormValues = {
  fullName: string;
  email: string;
  biography: string;
};

const defaultBiography = "Gerencia comercial enfocada en operaciones y crecimiento.";

export default function SettingsProfilePage() {
  const { data: session } = useSession();
  const fullName = session?.user?.name?.trim() || "";
  const email = session?.user?.email?.trim() || "";
  const avatarInitial = fullName.charAt(0).toUpperCase() || "U";

  const { register, handleSubmit, reset } = useForm<ProfileFormValues>({
    defaultValues: {
      fullName,
      email,
      biography: defaultBiography,
    },
  });

  useEffect(() => {
    reset({
      fullName,
      email,
      biography: defaultBiography,
    });
  }, [fullName, email, reset]);

  return (
    <section className="w-full grid gap-4 xl:grid-cols-[2fr_1fr] xl:items-start">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-6">
        <form onSubmit={handleSubmit(() => {})} className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Perfil</p>
            <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Información personal</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="Nombre completo"
              placeholder="Nombre completo"
              {...register("fullName")}
            />
            <FormInput
              label="Correo"
              type="email"
              placeholder="correo@empresa.com"
              {...register("email")}
            />
          </div>
          <FormTextarea
            label="Biografía"
            className="min-h-28"
            {...register("biography")}
          />
          <div className="flex w-full items-center justify-end gap-3">
            <button className="cursor-pointer rounded-xl bg-sky-600 text-white px-4 py-2 text-sm font-medium hover:bg-sky-500 transition-colors">
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={() =>
                reset({
                  fullName,
                  email,
                  biography: defaultBiography,
                })
              }
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium cursor-pointer text-zinc-800 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Avatar</h2>
          <div className="h-24 w-24 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
            <span className="text-2xl font-semibold text-slate-600 dark:text-slate-200">{avatarInitial}</span>
          </div>
          <div className="flex w-full justify-start">
            <button className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium cursor-pointer text-zinc-800 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900">
              Cambiar foto
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Datos laborales</h2>
          <div className="space-y-2">
            <div className="rounded-xl bg-white/70 dark:bg-slate-900 p-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Puesto</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Líder Comercial</p>
            </div>
            <div className="rounded-xl bg-white/70 dark:bg-slate-900 p-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Área</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Ventas</p>
            </div>
            <div className="rounded-xl bg-white/70 dark:bg-slate-900 p-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Sucursal</p>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Monterrey</p>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
