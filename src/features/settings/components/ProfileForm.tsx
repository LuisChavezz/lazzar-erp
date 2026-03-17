"use client";

import { Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { ProfileFormSchema, ProfileFormValues } from "@/src/features/settings/schemas/profile-form.schema";
import toast from "react-hot-toast";

interface ProfileFormProps {
  fullName: string;
  email: string;
}

const defaultBiography = "Gerencia comercial enfocada en operaciones y crecimiento.";

const emptyValues: ProfileFormValues = {
  fullName: "",
  email: "",
  biography: "",
};

export function ProfileForm({ fullName, email }: ProfileFormProps) {
  const editValues: ProfileFormValues = {
    fullName: fullName.trim(),
    email: email.trim(),
    biography: defaultBiography,
  };

  const isEditing = Boolean(editValues.fullName || editValues.email);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema) as Resolver<ProfileFormValues>,
    defaultValues: emptyValues,
    values: isEditing ? editValues : undefined,
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await Promise.resolve(data);
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo actualizar el perfil");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Perfil</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Información personal</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          label="Nombre completo"
          placeholder="Nombre completo"
          {...register("fullName")}
          error={errors.fullName}
        />
        <FormInput
          label="Correo"
          type="email"
          placeholder="correo@empresa.com"
          {...register("email")}
          error={errors.email}
        />
      </div>
      <FormTextarea
        label="Biografía"
        className="min-h-28"
        {...register("biography")}
        error={errors.biography}
      />
      <div className="flex w-full items-center justify-end gap-3">
        <FormSubmitButton isPending={isSubmitting} className="px-4 py-2">
          Guardar cambios
        </FormSubmitButton>
      </div>
    </form>
  );
}
