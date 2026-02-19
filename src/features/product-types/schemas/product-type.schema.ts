import { z } from "zod";

export const ProductTypeFormSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  descripcion: z.string().optional(),
});

export type ProductTypeFormValues = z.infer<typeof ProductTypeFormSchema>;
