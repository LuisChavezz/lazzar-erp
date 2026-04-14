import { z } from "zod";

export const UpcomingTaskFormSchema = z
  .object({
    title: z.string().min(1, "El título es requerido"),
    shortDescription: z.string().min(1, "La descripción corta es requerida"),
    comments: z.string().optional().or(z.literal("")),
    allDay: z.boolean(),
    // Campos para evento de todo el día (allDay = true)
    startDate: z.string(),
    endDate: z.string(),
    // Campos para evento con hora específica (allDay = false)
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.allDay) {
      if (!data.startDate) {
        ctx.addIssue({ code: "custom", message: "La fecha de inicio es requerida", path: ["startDate"] });
      }
      if (!data.endDate) {
        ctx.addIssue({ code: "custom", message: "La fecha de fin es requerida", path: ["endDate"] });
      }
      if (data.startDate && data.endDate && data.endDate < data.startDate) {
        ctx.addIssue({ code: "custom", message: "La fecha de fin debe ser igual o posterior a la de inicio", path: ["endDate"] });
      }
    } else {
      if (!data.date) {
        ctx.addIssue({ code: "custom", message: "La fecha es requerida", path: ["date"] });
      }
      if (!data.startTime) {
        ctx.addIssue({ code: "custom", message: "La hora de inicio es requerida", path: ["startTime"] });
      }
      if (!data.endTime) {
        ctx.addIssue({ code: "custom", message: "La hora de fin es requerida", path: ["endTime"] });
      }
      if (data.startTime && data.endTime && data.endTime < data.startTime) {
        ctx.addIssue({ code: "custom", message: "La hora de fin debe ser igual o posterior a la de inicio", path: ["endTime"] });
      }
    }
  });

export type UpcomingTaskFormValues = z.infer<typeof UpcomingTaskFormSchema>;
