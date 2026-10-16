import { z } from "zod";

/**
 * Validación del formulario de alta de un avance de bordado
 * (`POST /produccion/bordado-avances/`). Opera sobre los STRINGS de los inputs
 * y la conversión a número ocurre al enviar.
 *
 * El avance se captura POR OB (EC-491): no hay renglón (talla/SKU) que elegir.
 *
 * Las reglas son de UX únicamente: el backend solo exige `cantidad_bordada`
 * ≥ 0 (float) y `puntadas_por_pieza` entero ≥ 0.
 *
 *  - `cantidad_bordada`: ENTERO > 0 (piezas bordadas en esta tanda). El backend
 *    aceptaría decimales y 0, pero no se borda media prenda ni se registra una
 *    tanda vacía: la restricción es de negocio, no de esquema.
 *  - `puntadas_por_pieza`: entero >= 0, las puntadas que lleva UNA prenda. El 0
 *    se admite A PROPÓSITO —puede no conocerse el ponchado al registrar la
 *    tanda—, por eso NO se exige > 0; en ese caso el backend deja
 *    `puntadas_total` en 0.
 *  - `comentario`: opcional.
 */
export const CreateAvanceFormSchema = z.object({
  cantidad_bordada: z
    .string()
    .trim()
    .min(1, "Ingresa la cantidad bordada")
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) > 0,
      "Debe ser un número entero mayor a 0",
    ),
  puntadas_por_pieza: z
    .string()
    .trim()
    .min(1, "Ingresa las puntadas por pieza")
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) >= 0,
      "Debe ser un entero de 0 o más",
    ),
  comentario: z.string().trim().max(500, "Máximo 500 caracteres"),
});

export type CreateAvanceFormValues = z.infer<typeof CreateAvanceFormSchema>;

/** Campos del formulario, para tipar el mapa de errores por campo. */
export type CreateAvanceFormField = keyof CreateAvanceFormValues;
