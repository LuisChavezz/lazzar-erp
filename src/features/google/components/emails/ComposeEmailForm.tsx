"use client";

import { MainDialog } from "@/src/components/MainDialog";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormSubmitButton } from "@/src/components/FormButtons";
import { useComposeEmailForm } from "../../hooks/useComposeEmailForm";

// --- Props ---

interface ComposeEmailFormProps {
  /** Controla la visibilidad del diálogo desde el componente padre. */
  open: boolean;
  /** Callback para notificar cambios en la visibilidad del diálogo. */
  onOpenChange: (open: boolean) => void;
}

// --- Componente ---

/**
 * Formulario modal para redactar y enviar un correo electrónico.
 *
 * Combina `MainDialog` como contenedor visual con TanStack Form + Zod
 * para la gestión y validación del estado del formulario.
 *
 * El botón de envío se pasa como `actionButton` al diálogo y delega
 * directamente en `form.handleSubmit()`, separando la lógica de submit
 * del evento DOM del formulario interior.
 *
 * Al envío exitoso, el hook llama a `onSuccess`, que cierra el diálogo
 * y limpia el formulario para la próxima apertura.
 */
export function ComposeEmailForm({ open, onOpenChange }: ComposeEmailFormProps) {
  const {
    form,
    isPending,
    getError,
    clearFieldErrors,
    validateField,
    handleFormSubmit,
  } = useComposeEmailForm({
    onSuccess: () => onOpenChange(false),
  });

  return (
    <MainDialog
      title="Redactar correo"
      description="Completa los campos para enviar un correo desde tu cuenta de Google conectada."
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="580px"
      actionButtonClose={false}
      actionButton={
        <FormSubmitButton
          // Al estar fuera del <form>, se usa type="button" y onClick
          // para delegar en form.handleSubmit() sin depender del evento DOM.
          type="button"
          isPending={isPending}
          loadingLabel="Enviando..."
          onClick={() => {
            void form.handleSubmit();
          }}
        >
          Enviar correo
        </FormSubmitButton>
      }
    >
      {/* El formulario gestiona su propio evento submit como fallback
          (p.ej. si el usuario presiona Enter en un campo de texto). */}
      <form onSubmit={handleFormSubmit} noValidate>
        <fieldset
          disabled={isPending}
          className={`space-y-4 transition-opacity duration-200 ${isPending ? "opacity-60" : ""}`}
        >
          {/* Campo: Para */}
          <form.Field name="to">
            {(field) => (
              <FormInput
                label="Para"
                type="email"
                placeholder="destinatario@ejemplo.com"
                name={field.name}
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  clearFieldErrors("to");
                }}
                onBlur={() => {
                  field.handleBlur();
                  validateField("to", field.state.value);
                }}
                error={getError("to")}
                autoFocus
              />
            )}
          </form.Field>

          {/* Campo: Asunto */}
          <form.Field name="subject">
            {(field) => (
              <FormInput
                label="Asunto"
                placeholder="Escribe el asunto del correo"
                name={field.name}
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  clearFieldErrors("subject");
                }}
                onBlur={() => {
                  field.handleBlur();
                  validateField("subject", field.state.value);
                }}
                error={getError("subject")}
              />
            )}
          </form.Field>

          {/* Campo: Mensaje */}
          <form.Field name="body">
            {(field) => (
              <FormTextarea
                label="Mensaje"
                placeholder="Escribe el contenido del correo..."
                name={field.name}
                value={field.state.value}
                rows={8}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  clearFieldErrors("body");
                }}
                onBlur={() => {
                  field.handleBlur();
                  validateField("body", field.state.value);
                }}
                error={getError("body")}
              />
            )}
          </form.Field>
        </fieldset>
      </form>
    </MainDialog>
  );
}
