"use client";

import { Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput } from "@/src/components/FormInput";
import { FormSubmitButton } from "@/src/components/FormButtons";
import {
  ChangePasswordFormSchema,
  ChangePasswordFormValues,
} from "@/src/features/settings/schemas/change-password-form.schema";
import toast from "react-hot-toast";

const emptyValues: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(ChangePasswordFormSchema) as Resolver<ChangePasswordFormValues>,
    defaultValues: emptyValues,
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    try {
      await Promise.resolve(data);
      toast.success("Contraseña actualizada correctamente");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo actualizar la contraseña");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-6 space-y-4 h-fit">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cambio de contraseña</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          label="Contraseña actual"
          type="password"
          {...register("currentPassword")}
          error={errors.currentPassword}
        />
        <FormInput
          label="Nueva contraseña"
          type="password"
          {...register("newPassword")}
          error={errors.newPassword}
        />
        <FormInput
          label="Confirmar contraseña"
          type="password"
          {...register("confirmPassword")}
          error={errors.confirmPassword}
        />
        <div className="flex w-full justify-end gap-3">
          <FormSubmitButton isPending={isSubmitting} className="px-4 py-2">
            Actualizar contraseña
          </FormSubmitButton>
        </div>
      </form>
    </div>
  );
}
