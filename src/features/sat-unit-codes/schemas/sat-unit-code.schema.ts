import { z } from "zod";

export const SatUnitCodeFormSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  descripcion: z.string().min(1, "La descripción es requerida"),
  estatus: z.string().min(1, "El estatus es requerido"),
});

export type SatUnitCodeFormValues = z.infer<typeof SatUnitCodeFormSchema>;
