import { z } from "zod";

/**
 * Renglón de materia prima dentro de la lista de materiales.
 *
 * `variante_produccion` siempre viaja como `null` desde este formulario.
 * `unidad` usa `0` como centinela de "sin seleccionar" (mismo criterio que los
 * selectores de producto/color/talla en el resto de la app), por lo que se
 * exige un entero positivo.
 */
export const MateriaPrimaDetalleFormSchema = z.object({
  variante_produccion: z.null(),
  componente: z.number().int().positive("El componente es requerido"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  unidad: z.number().int().positive("La unidad es requerida"),
  desperdicio: z
    .number()
    .int("El desperdicio debe ser un número entero")
    .min(0, "El desperdicio no puede ser negativo"),
  obligatorio: z.boolean(),
  observaciones: z.string(),
});

/**
 * Cuerpo completo para crear una lista de materiales
 * (`POST /produccion/lista-material/`).
 */
export const ListaMaterialFormSchema = z.object({
  empresa: z.number().int().positive("La empresa es requerida"),
  producto_variante: z
    .number()
    .int()
    .positive("La variante de producto es requerida"),
  variante_produccion: z.null(),
  version: z.number().int().positive(),
  observaciones: z.string(),
  materia_prima_detalle: z
    .array(MateriaPrimaDetalleFormSchema)
    .min(1, "Agrega al menos un material"),
});

export type MateriaPrimaDetalleFormValues = z.infer<
  typeof MateriaPrimaDetalleFormSchema
>;
export type ListaMaterialFormValues = z.infer<typeof ListaMaterialFormSchema>;
