import { z } from "zod";

/**
 * Validación del formulario de alta de un avance de bordado
 * (`POST /produccion/bordado-avances/`). Opera sobre los STRINGS de los inputs
 * y la conversión a número ocurre al enviar.
 *
 * Las reglas son de UX únicamente: el backend NO las impone
 * (`BordadoAvancesSerializer` usa `fields="__all__"` con `activo` como único
 * read-only, sin validadores de rango).
 *
 *  - `orden_bordado_detalle`: renglón (talla/SKU) elegido. Opcional en el
 *    backend, pero la UX SIEMPRE lo exige, así que aquí es requerido.
 *  - `cantidad_bordada`: ENTERO > 0 (piezas bordadas en esta tanda). El modelo
 *    es un `FloatField` y el backend aceptaría decimales, pero no se borda
 *    media prenda: la restricción es de negocio, no de esquema.
 *  - `puntadas_por_pieza`: entero >= 0, las puntadas que lleva UNA prenda. El 0
 *    se admite A PROPÓSITO —puede no conocerse el ponchado al registrar la
 *    tanda—, por eso NO se exige > 0; en ese caso el backend deja
 *    `puntadas_total` en 0 en vez de calcularlo.
 *  - `comentario`: opcional.
 */
export const CreateAvanceFormSchema = z.object({
  orden_bordado_detalle: z
    .string()
    .trim()
    .min(1, "Selecciona una talla o SKU")
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) > 0,
      "Selecciona una talla o SKU",
    ),
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
