"use client";

import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { useProfileForm } from "../hooks/useProfileForm";

interface ProfileFormProps {
  fullName: string;
  email: string;
}

export function ProfileForm({ fullName, email }: ProfileFormProps) {
  const {
    form,
    isPending,
    getError,
    clearFieldError,
    handleFormSubmit,
  } = useProfileForm({ fullName, email });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Perfil</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Información personal</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <form.Field name="fullName">
          {(field) => (
            <FormInput
              label="Nombre completo"
              placeholder="Nombre completo"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldError("fullName");
              }}
              onBlur={field.handleBlur}
              error={getError("fullName")}
            />
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <FormInput
              label="Correo"
              type="email"
              placeholder="correo@empresa.com"
              name={field.name}
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                clearFieldError("email");
              }}
              onBlur={field.handleBlur}
              error={getError("email")}
            />
          )}
        </form.Field>
      </div>
      <form.Field name="biography">
        {(field) => (
          <FormTextarea
            label="Biografía"
            className="min-h-28"
            name={field.name}
            value={field.state.value}
            onChange={(event) => {
              field.handleChange(event.target.value);
              clearFieldError("biography");
            }}
            onBlur={field.handleBlur}
            error={getError("biography")}
          />
        )}
      </form.Field>
      <div className="flex w-full items-center justify-end gap-3">
        <FormSubmitButton isPending={isPending} className="px-4 py-2">
          Guardar cambios
        </FormSubmitButton>
      </div>
    </form>
  );
}
