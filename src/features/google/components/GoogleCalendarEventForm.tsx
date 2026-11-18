"use client";

import { useStore } from "@tanstack/react-form";
import { FormInput } from "@/src/components/FormInput";
import { FormTextarea } from "@/src/components/FormTextarea";
import { FormCancelButton, FormSubmitButton } from "@/src/components/FormButtons";
import { FormToggle } from "@/src/components/FormToggle";
import { useGoogleCalendarEventForm } from "../hooks/useGoogleCalendarEventForm";

interface GoogleCalendarEventFormProps {
  onSuccess: () => void;
  /** Fecha inicial (YYYY-MM-DD) preseleccionada desde el clic en el calendario. */
  initialDate?: string;
}

export default function GoogleCalendarEventForm({ onSuccess, initialDate }: GoogleCalendarEventFormProps) {
  const {
    form,
    isPending,
    getError,
    clearFieldError,
    handleAllDayToggle,
    handleReset,
    handleFormSubmit,
  } = useGoogleCalendarEventForm({ onSuccess, initialDate });

  // Suscripción reactiva al valor de allDay para alternar los campos de fecha/hora.
  const isAllDay = useStore(form.baseStore, (s) => s.values.allDay);

  return (
    <form onSubmit={handleFormSubmit} className="w-full">
      <fieldset disabled={isPending} className="space-y-5 group-disabled:opacity-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          {/* Título del evento */}
          <form.Field name="summary">
            {(field) => (
              <div className="group/field md:col-span-2">
                <FormInput
                  label="Título del evento"
                  placeholder="Ej. Reunión con cliente"
                  className="text-2xl font-bold"
                  variant="ghost"
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldError("summary");
                  }}
                  onBlur={field.handleBlur}
                  error={getError("summary")}
                />
              </div>
            )}
          </form.Field>

          {/* Descripción */}
          <form.Field name="description">
            {(field) => (
              <div className="md:col-span-2">
                <FormTextarea
                  label="Descripción"
                  rows={3}
                  placeholder="Detalles del evento (opcional)"
                  name={field.name}
                  value={field.state.value ?? ""}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    clearFieldError("description");
                  }}
                  onBlur={field.handleBlur}
                  error={getError("description")}
                />
              </div>
            )}
          </form.Field>

          {/* Toggle: evento de todo el día o con hora específica */}
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
            // Modo todo el día: solo fechas, sin hora.
            <>
              <form.Field name="start_date">
                {(field) => (
                  <div>
                    <FormInput
                      label="Fecha de inicio"
                      type="date"
                      className="dark:scheme-dark cursor-pointer"
                      onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } }}
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        clearFieldError("start_date");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("start_date")}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="end_date">
                {(field) => (
                  <div>
                    <FormInput
                      label="Fecha de fin (opcional)"
                      type="date"
                      className="dark:scheme-dark cursor-pointer"
                      onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } }}
                      name={field.name}
                      value={field.state.value ?? ""}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        clearFieldError("end_date");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("end_date")}
                    />
                  </div>
                )}
              </form.Field>
            </>
          ) : (
            // Modo con hora: fecha + hora inicio y hora fin opcionales.
            <>
              <form.Field name="start_date">
                {(field) => (
                  <div className="md:col-span-2">
                    <FormInput
                      label="Fecha"
                      type="date"
                      className="dark:scheme-dark cursor-pointer"
                      onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } }}
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        clearFieldError("start_date");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("start_date")}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="start_time">
                {(field) => (
                  <div>
                    <FormInput
                      label="Hora de inicio"
                      type="time"
                      className="dark:scheme-dark cursor-pointer"
                      onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } }}
                      name={field.name}
                      value={field.state.value ?? ""}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        clearFieldError("start_time");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("start_time")}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="end_time">
                {(field) => (
                  <div>
                    <FormInput
                      label="Hora de fin (opcional)"
                      type="time"
                      className="dark:scheme-dark cursor-pointer"
                      onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } }}
                      name={field.name}
                      value={field.state.value ?? ""}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                        clearFieldError("end_time");
                      }}
                      onBlur={field.handleBlur}
                      error={getError("end_time")}
                    />
                  </div>
                )}
              </form.Field>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-end">
          <FormCancelButton onClick={handleReset} disabled={isPending} />
          <FormSubmitButton isPending={isPending} loadingLabel="Creando evento...">
            Crear evento
          </FormSubmitButton>
        </div>
      </fieldset>
    </form>
  );
}
