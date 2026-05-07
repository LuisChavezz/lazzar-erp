/**
 * Schema para la validación de la selección de color por producto en el paso de colores.
 * Verifica que se haya elegido un color válido (id entero mayor a 0).
 */
import { z } from "zod";

export const colorSelectionSchema = z.object({
  colorId: z
    .number({ error: "Selecciona un color" })
    .int()
    .min(1, "Selecciona un color"),
});

export type ColorSelectionValues = z.infer<typeof colorSelectionSchema>;
