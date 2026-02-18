import { z } from "zod";

export const ProductCategoryFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  codigo: z.string().min(1, "El código es requerido"),
  descripcion: z.string().optional(),
  activo: z.boolean(),
});

export type ProductCategoryFormValues = z.infer<typeof ProductCategoryFormSchema>;
