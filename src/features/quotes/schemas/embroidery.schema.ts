import { z } from "zod";
import { embroiderySpecSchema } from "./embroidery-spec.schema";

export const embroiderySchema = z.object({
  activo: z.boolean(),
  nuevoPonchado: z.boolean(),
  observaciones: z.string().optional(),
  especificaciones: z.array(embroiderySpecSchema),
});