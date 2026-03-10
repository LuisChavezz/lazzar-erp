import { z } from "zod";

export const UpcomingTaskFormSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  shortDescription: z.string().min(1, "La descripción corta es requerida"),
  comments: z.string().optional().or(z.literal("")),
  dueDate: z.string().min(1, "La fecha y hora son requeridas"),
});

export type UpcomingTaskFormValues = z.infer<typeof UpcomingTaskFormSchema>;
