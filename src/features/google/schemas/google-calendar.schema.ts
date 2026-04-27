import { z } from "zod";

// --- Schema de validación para el formulario de creación de eventos de Google Calendar ---

export const GoogleCalendarEventSchema = z
  .object({
    summary: z.string().min(1, "El título del evento es requerido"),
    description: z.string().optional().or(z.literal("")),
    allDay: z.boolean(),
    // Siempre requerido — YYYY-MM-DD
    start_date: z.string(),
    // Opcional — YYYY-MM-DD
    end_date: z.string().optional().or(z.literal("")),
    // Requerido cuando allDay = false — HH:MM
    start_time: z.string().optional().or(z.literal("")),
    // Opcional cuando allDay = false — HH:MM
    end_time: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (!data.start_date) {
      ctx.addIssue({
        code: "custom",
        message: "La fecha de inicio es requerida",
        path: ["start_date"],
      });
    }

    if (!data.allDay && !data.start_time) {
      ctx.addIssue({
        code: "custom",
        message: "La hora de inicio es requerida",
        path: ["start_time"],
      });
    }

    if (data.end_date && data.start_date && data.end_date < data.start_date) {
      ctx.addIssue({
        code: "custom",
        message: "La fecha de fin debe ser igual o posterior a la de inicio",
        path: ["end_date"],
      });
    }

    if (
      !data.allDay &&
      data.start_time &&
      data.end_time &&
      data.start_date === (data.end_date || data.start_date) &&
      data.end_time < data.start_time
    ) {
      ctx.addIssue({
        code: "custom",
        message: "La hora de fin debe ser igual o posterior a la de inicio",
        path: ["end_time"],
      });
    }
  });

export type GoogleCalendarEventFormValues = z.infer<typeof GoogleCalendarEventSchema>;
