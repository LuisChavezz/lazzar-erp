"use client";

import { FormInput } from "../../../components/FormInput";
import { FormTextarea } from "../../../components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { ClockIcon } from "../../../components/Icons";
import { UpcomingTask } from "../interfaces/upcoming-task.interface";
import { useUpcomingTaskForm } from "../hooks/useUpcomingTaskForm";

interface UpcomingTaskFormProps {
  onSuccess: () => void;
  taskToEdit?: UpcomingTask | null;
  defaultCalendarDate?: Date | null;
  dialogOpen?: boolean;
}

export default function UpcomingTaskForm({
  onSuccess,
  taskToEdit,
  defaultCalendarDate,
  dialogOpen = false,
}: UpcomingTaskFormProps) {
  const {
    form,
    isPending,
    isEditing,
    getError,
    clearFieldError,
    handleFormSubmit,
    handleClear,
  } = useUpcomingTaskForm({ onSuccess, taskToEdit, defaultCalendarDate, dialogOpen });

  return (
    <form onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="group-disabled:opacity-50">
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-8">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-slate-50/50 dark:bg-white/2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-slate-900 dark:text-white text-lg">
                Información de la tarea
              </h3>
              <p className="text-xs text-slate-500">Datos de seguimiento y programación</p>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <form.Field name="title">
                {(field) => (
                  <div className="group/field md:col-span-2">
                    <FormInput
                      label="Título"
                      placeholder="Ej. Llamada con cliente X"
                      className="text-2xl font-bold"
                      variant="ghost"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldError("title");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("title")}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="shortDescription">
                {(field) => (
                  <div className="md:col-span-2">
                    <FormInput
                      label="Descripción corta"
                      placeholder="Resumen breve de la tarea"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldError("shortDescription");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("shortDescription")}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="comments">
                {(field) => (
                  <div className="md:col-span-2">
                    <FormTextarea
                      label="Comentarios"
                      rows={3}
                      placeholder="Detalles adicionales"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldError("comments");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("comments")}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="dueDate">
                {(field) => (
                  <div className="md:col-span-2">
                    <FormInput
                      label="Fecha y hora (GMT-6)"
                      type="datetime-local"
                      className="dark:scheme-dark"
                      name={field.name}
                      value={field.state.value}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearFieldError("dueDate");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("dueDate")}
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-end">
          <FormCancelButton
            onClick={handleClear}
            disabled={isPending}
          />
          <FormSubmitButton
            isPending={isPending}
            loadingLabel={isEditing ? "Actualizando..." : "Guardando..."}
          >
            {isEditing ? "Actualizar Tarea" : "Registrar Tarea"}
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
