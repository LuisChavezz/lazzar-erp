import { z } from "zod";

/**
 * Campos que el backend admite vacíos y que el alta rápida deja en `null`. En
 * la edición solo se exigen si el producto YA los tenía al abrir el
 * formulario: editar un producto del alta rápida no obliga a capturar datos
 * fiscales, pero un valor existente no se puede vaciar.
 */
export const PRODUCT_CONDITIONAL_FIELDS = [
  "descripcion",
  "unidad_medida",
  "impuesto",
  "sat_prodserv",
  "sat_unidad",
] as const;

export type ProductConditionalField = (typeof PRODUCT_CONDITIONAL_FIELDS)[number];

/** `true` = el producto traía valor en ese campo, así que es obligatorio. */
export type ProductRequiredFields = Record<ProductConditionalField, boolean>;

// `0` es "sin seleccionar" en los `<select>` de catálogo (mismo convenio que el
// alta rápida). Opcional, admite `0`; obligatorio, exige un id.
const catalogId = (required: boolean, message: string) =>
  required ? z.number().int().positive(message) : z.number().int().nonnegative();

/**
 * Schema de la edición de producto. Es una FACTORÍA porque la obligatoriedad
 * de los campos condicionales depende del registro que se edita (mismo patrón
 * que `createVacationFormSchema`). Devuelve un `z.object` plano para que
 * `validateField` siga pudiendo leer `.shape[field]`.
 */
export const createProductEditSchema = (required: ProductRequiredFields) =>
  z.object({
    nombre: z.string().min(1, "El nombre es requerido"),
    descripcion: required.descripcion
      ? z.string().refine((value) => value.trim() !== "", "La descripción es requerida")
      : z.string(),
    // Sin `tipo`: se fija en el alta rápida y en la edición es de solo lectura.
    categoria_producto: z.coerce.number().min(1, "La categoría es requerida"),
    unidad_medida: catalogId(required.unidad_medida, "La unidad de medida es requerida"),
    impuesto: catalogId(required.impuesto, "El impuesto es requerido"),
    sat_prodserv: catalogId(required.sat_prodserv, "La clave SAT prod/serv es requerida"),
    sat_unidad: catalogId(required.sat_unidad, "La clave SAT unidad es requerida"),
    precio_base: z.coerce
      .number()
      .positive("El precio base debe ser mayor a cero")
      .refine((n) => /^\d+(\.\d{1,2})?$/.test(n.toString()), "Máximo 2 decimales"),
    activo: z.boolean(),
  });

export type ProductFormValues = z.infer<ReturnType<typeof createProductEditSchema>>;
