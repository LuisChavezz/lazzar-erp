"use client";

import { useStore } from "@tanstack/react-form";
import { FormInput } from "../../../components/FormInput";
import { FormTextarea } from "../../../components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "../../../components/FormButtons";
import { FormToggle } from "../../../components/FormToggle";
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
    handleAllDayToggle,
  } = useUpcomingTaskForm({ onSuccess, taskToEdit, defaultCalendarDate, dialogOpen });

  // Suscripción reactiva al valor de allDay para alternar los campos de fecha/hora.
  const isAllDay = useStore(form.baseStore, (s) => s.values.allDay);

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

              {/* Toggle: determina si el evento ocupa todo el día o tiene hora específica */}
              <div className="md:col-span-2">
                <form.Field name="allDay">
                  {(field) => (
                    <FormToggle
                      name={field.name}
                      checked={field.state.value}
                      onChange={(e) => handleAllDayToggle(e.target.checked)}
                      label="Programación"
                      description="Evento de todo el día"
                    />
                  )}
                </form.Field>
              </div>

              {isAllDay ? (
                // Modo todo el día: dos selectores de fecha (inicio y fin), sin hora.
                // La hora se asigna automáticamente: 00:00:00 y 23:59:59 en GMT-6.
                <>
                  <form.Field name="startDate">
                    {(field) => (
                      <div>
                        <FormInput
                          label="Fecha de inicio"
                          type="date"
                          className="dark:scheme-dark cursor-pointer"
                          onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } }}
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            clearFieldError("startDate");
                          }}
                          onBlur={field.handleBlur}
                          error={getError("startDate")}
                        />
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="endDate">
                    {(field) => (
                      <div>
                        <FormInput
                          label="Fecha de fin"
                          type="date"
                          className="dark:scheme-dark cursor-pointer"
                          onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } }}
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            clearFieldError("endDate");
                          }}
                          onBlur={field.handleBlur}
                          error={getError("endDate")}
                        />
                      </div>
                    )}
                  </form.Field>
                </>
              ) : (
                // Modo con hora: un selector de fecha y dos de hora (inicio y fin).
                // La fecha de inicio y fin es la misma; solo varía la hora.
                <>
                  <form.Field name="date">
                    {(field) => (
                      <div className="md:col-span-2">
                        <FormInput
                          label="Fecha (GMT-6)"
                          type="date"
                          className="dark:scheme-dark cursor-pointer"
                          onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } }}
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            clearFieldError("date");
                          }}
                          onBlur={field.handleBlur}
                          error={getError("date")}
                        />
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="startTime">
                    {(field) => (
                      <div>
                        <FormInput
                          label="Hora de inicio (GMT-6)"
                          type="time"
                          className="dark:scheme-dark cursor-pointer"
                          onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } }}
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            clearFieldError("startTime");
                          }}
                          onBlur={field.handleBlur}
                          error={getError("startTime")}
                        />
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="endTime">
                    {(field) => (
                      <div>
                        <FormInput
                          label="Hora de fin (GMT-6)"
                          type="time"
                          className="dark:scheme-dark cursor-pointer"
                          onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } }}
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) => {
                            field.handleChange(event.target.value);
                            clearFieldError("endTime");
                          }}
                          onBlur={field.handleBlur}
                          error={getError("endTime")}
                        />
                      </div>
                    )}
                  </form.Field>
                </>
              )}
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
