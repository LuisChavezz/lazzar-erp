import { z } from "zod";

/**
 * `salario_base` se maneja como string decimal (igual que lo expone el
 * backend: DecimalField(10,2)) para no perder precisión ni confundir un campo
 * vacío con 0. Cadena vacía = sin salario asignado.
 */
export const PositionFormSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  // 0 es el valor centinela de la opción "Sin área" del select.
  area: z.number().int("El área es inválida").nonnegative("El área es inválida"),
  salario_base: z
    .string()
    .refine(
      (value) => value === "" || /^\d{1,8}(\.\d{1,2})?$/.test(value),
      "Importe inválido (máximo 8 enteros y 2 decimales)"
    ),
  descripcion: z.string(),
});

export type PositionFormValues = z.infer<typeof PositionFormSchema>;
