import { z } from "zod";

export const SizeFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  activo: z.boolean(),
});

export type SizeFormValues = z.infer<typeof SizeFormSchema>;
