import { z } from "zod";

export const TaxFormSchema = z.object({
  codigo: z.string().min(1, "El código es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  tasa: z
    .string()
    .min(1, "La tasa es requerida")
    .regex(
      /^(0(\.\d{1,2})?|1(\.0{1,2})?)$/,
      "Debe ser un número entre 0.01 y 1.00 con máximo 2 decimales"
    )
    .refine((val) => Number(val) >= 0.01, {
      message: "La tasa debe ser mayor o igual a 0.01",
    }),
  tipo: z.string().min(1, "El tipo es requerido"),
  estatus: z.boolean(),
});

export type TaxFormValues = z.infer<typeof TaxFormSchema>;
