import { z } from "zod";

export const AreaFormSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(150, "El nombre no puede exceder 150 caracteres"),
  // 0 es el valor centinela de la opción "Seleccionar..." del select.
  departamento: z
    .number()
    .int("El departamento es inválido")
    .positive("El departamento es requerido"),
  codigo: z.string().max(20, "El código no puede exceder 20 caracteres"),
  descripcion: z.string(),
});

export type AreaFormValues = z.infer<typeof AreaFormSchema>;
