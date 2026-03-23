import { z } from "zod";

export const ProductFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  descripcion: z.string().min(1, "La descripción es requerida"),
  tipo: z.string().min(1, "El tipo es requerido"),
  categoria_producto: z.coerce.number().min(1, "La categoría es requerida"),
  unidad_medida: z.coerce.number().min(1, "La unidad de medida es requerida"),
  impuesto: z.coerce.number().min(1, "El impuesto es requerido"),
  sat_prodserv: z.coerce.number().min(1, "La clave SAT prod/serv es requerida"),
  sat_unidad: z.coerce.number().min(1, "La clave SAT unidad es requerida"),
  precio_base: z.coerce
    .number()
    .positive("El precio base debe ser mayor a cero")
    .refine((n) => /^\d+(\.\d{1,2})?$/.test(n.toString()), "Máximo 2 decimales"),
  activo: z.boolean(),
});

export type ProductFormValues = z.infer<typeof ProductFormSchema>;
