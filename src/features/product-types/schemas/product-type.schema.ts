import { z } from "zod";

/**
 * `nombre` es obligatorio aquí aunque el backend lo admita vacío
 * (`default=""`): un tipo sin nombre se vería en blanco en los selectores.
 * Tope: `CharField(max_length=100)`.
 */
export const ProductTypeFormSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),
});

export type ProductTypeFormValues = z.infer<typeof ProductTypeFormSchema>;
