import { z } from "zod";
import {
  CATEGORIA_LINEAS,
  isUnrecognizedLinea,
  type CategoriaLineaRaw,
} from "../constants/categoriaLinea";

const LINEA_ERROR = "Selecciona una línea válida";

/**
 * Esquema del formulario de categoría. `linea` acepta las mismas opciones que
 * valida el backend y `""` (sin línea, materia prima). Si la categoría que se
 * edita trae una línea que el catálogo del front aún no conoce
 * (`currentLinea`), también acepta ESA línea tal cual, para que guardar sin
 * tocar el campo funcione y no se reescriba en silencio.
 */
export const createProductCategoryFormSchema = (currentLinea?: string | null) =>
  z.object({
    nombre: z.string().min(1, "El nombre es requerido"),
    linea: isUnrecognizedLinea(currentLinea)
      ? z.union([z.enum(CATEGORIA_LINEAS), z.literal(""), z.literal(currentLinea)], { error: LINEA_ERROR })
      : z.union([z.enum(CATEGORIA_LINEAS), z.literal("")], { error: LINEA_ERROR }),
    codigo: z.string().min(1, "El código es requerido"),
    descripcion: z.string().min(1, "La descripción es requerida"),
  });

/** Esquema de alta (sin línea previa que conservar). */
export const ProductCategoryFormSchema = createProductCategoryFormSchema();

export type ProductCategoryFormValues = Omit<z.infer<typeof ProductCategoryFormSchema>, "linea"> & {
  linea: CategoriaLineaRaw;
};
