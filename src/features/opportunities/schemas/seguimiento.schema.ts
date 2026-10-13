import { z } from "zod";
import { isCompleteDateEntry } from "@/src/utils/formatDate";
import { TIPO_SEGUIMIENTO_VALUES } from "../constants/seguimientoChoices";

/**
 * Formulario de un seguimiento. Los nombres son los del backend.
 *
 * `fecha_recordatorio` acepta fechas pasadas a propósito (el backend también):
 * sirve para dejar registrado algo que ya debió atenderse.
 */
export const SeguimientoFormSchema = z.object({
  tipo: z.enum(TIPO_SEGUIMIENTO_VALUES, { message: "El tipo es inválido" }),
  detalle: z.string().trim().min(1, "Escribe el detalle del seguimiento"),
  // `""` = sin recordatorio.
  fecha_recordatorio: z
    .string()
    .refine((value) => value === "" || isCompleteDateEntry(value), "Fecha inválida"),
});

/** Schemas por campo, para la validación en blur. */
export const SeguimientoFormFields = SeguimientoFormSchema.shape;

export type SeguimientoFormValues = z.infer<typeof SeguimientoFormSchema>;
