import { z } from "zod";

/**
 * Motivo de rechazo de una cotización. Misma regla que el backend: obligatorio
 * y no solo espacios. Sin longitud máxima, porque el backend no la tiene.
 */
export const quoteRejectSchema = z.object({
  comentario: z.string().trim().min(1, "Indica el motivo del rechazo"),
});
