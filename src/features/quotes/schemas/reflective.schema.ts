/**
 * Schemas para reflejantes
 * - `reflectiveSpecSchema`: una especificación individual (opción, posición, tipo)
 * - `reflectiveSchema`: objeto que agrupa el estado activo, observaciones y
 *   el arreglo de especificaciones.
 */
import { z } from "zod";

export const reflectiveSpecSchema = z.object({
  opcion: z.string(),
  posicion: z.string(),
  tipo: z.string(),
});

export const reflectiveSchema = z.object({
  activo: z.boolean(),
  observaciones: z.string().optional(),
  especificaciones: z.array(reflectiveSpecSchema),
});
