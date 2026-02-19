import { z } from "zod";

export const UnitOfMeasureFormSchema = z.object({
  clave: z.string().min(1, "La clave es requerida"),
  nombre: z.string().min(1, "El nombre es requerido"),
  estatus: z.boolean(),
});

export type UnitOfMeasureFormValues = z.infer<typeof UnitOfMeasureFormSchema>;
