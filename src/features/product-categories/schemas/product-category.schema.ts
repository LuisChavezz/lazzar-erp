import { z } from "zod";
import { CATEGORIA_LINEAS } from "../constants/categoriaLinea";

export const ProductCategoryFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  // Mismas opciones que valida el backend; `""` = sin línea (materia prima).
  linea: z.union([z.enum(CATEGORIA_LINEAS), z.literal("")], {
    error: "Selecciona una línea válida",
  }),
  codigo: z.string().min(1, "El código es requerido"),
  descripcion: z.string().min(1, "La descripción es requerida"),
});

export type ProductCategoryFormValues = z.infer<typeof ProductCategoryFormSchema>;
