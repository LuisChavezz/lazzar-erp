import { z } from "zod";

export const SatProdservCodeFormSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  descripcion: z.string().min(1, "La descripción es requerida"),
  estatus: z.string().min(1, "El estatus es requerido"),
});

export type SatProdservCodeFormValues = z.infer<typeof SatProdservCodeFormSchema>;
