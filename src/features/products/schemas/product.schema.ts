import { z } from "zod";

export const ProductFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  descripcion: z.string().min(1, "La descripción es requerida"),
  tipo: z.coerce.number().min(1, "El tipo es requerido"),
  categoria_producto_id: z.coerce.number().min(1, "La categoría es requerida"),
  unidad_medida_id: z.coerce.number().min(1, "La unidad de medida es requerida"),
  impuesto_id: z.coerce.number().min(1, "El impuesto es requerido"),
  sat_prodserv_id: z.coerce.number().min(1, "La clave SAT prod/serv es requerida"),
  sat_unidad_id: z.coerce.number().min(1, "La clave SAT unidad es requerida"),
  activo: z.boolean(),
});

export type ProductFormValues = z.infer<typeof ProductFormSchema>;
