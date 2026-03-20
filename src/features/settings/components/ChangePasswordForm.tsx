"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { useChangePasswordForm } from "../hooks/useChangePasswordForm";

export function ChangePasswordForm() {
  const {
    form,
    isPending,
    getError,
    clearFieldError,
    handleFormSubmit,
  } = useChangePasswordForm();

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-6 space-y-4 h-fit">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cambio de contraseña</h2>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <form.Field name="currentPassword">
          {(field) => (
            <FormInput
              label="Contraseña actual"
              type="password"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldError("currentPassword");
              }}
              onBlur={field.handleBlur}
              error={getError("currentPassword")}
            />
          )}
        </form.Field>
        <form.Field name="newPassword">
          {(field) => (
            <FormInput
              label="Nueva contraseña"
              type="password"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldError("newPassword");
              }}
              onBlur={field.handleBlur}
              error={getError("newPassword")}
            />
          )}
        </form.Field>
        <form.Field name="confirmPassword">
          {(field) => (
            <FormInput
              label="Confirmar contraseña"
              type="password"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldError("confirmPassword");
              }}
              onBlur={field.handleBlur}
              error={getError("confirmPassword")}
            />
          )}
        </form.Field>
        <div className="flex w-full justify-end gap-3">
          <FormSubmitButton isPending={isPending} className="px-4 py-2">
            Actualizar contraseña
          </FormSubmitButton>
        </div>
      </form>
    </div>
  );
}
