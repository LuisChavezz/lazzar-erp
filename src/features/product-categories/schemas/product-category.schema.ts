import { z } from "zod";

export const ProductCategoryFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  codigo: z.string().min(1, "El código es requerido"),
  descripcion: z.string().min(1, "La descripción es requerida"),
});

export type ProductCategoryFormValues = z.infer<typeof ProductCategoryFormSchema>;
