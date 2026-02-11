import { z } from "zod";

export const CurrencyFormSchema = z.object({
  codigo_iso: z
    .string()
    .min(3, "El código ISO debe tener 3 caracteres")
    .max(3, "El código ISO debe tener 3 caracteres")
    .regex(/^[A-Z]{3}$/, "El código ISO debe ser 3 letras mayúsculas"),
  nombre: z.string().min(1, "El nombre es requerido"),
  simbolo: z.string().min(1, "El símbolo es requerido"),
  decimales: z.number().min(0, "Los decimales no pueden ser negativos").max(10, "Máximo 10 decimales"),
  estatus: z.boolean(),
});

export type CurrencyFormValues = z.infer<typeof CurrencyFormSchema>;
