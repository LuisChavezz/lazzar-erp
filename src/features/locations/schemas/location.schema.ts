import { z } from "zod";

export const LocationFormSchema = z.object({
  name: z.string().min(1, "El nombre de la ubicación es requerido"),
  code: z.string().min(1, "El código es requerido"),
  warehouse: z.string().min(1, "El almacén es requerido"),
  status: z.enum(["Disponible", "Ocupado", "Mantenimiento"], {
    message: "El estatus es requerido.",
  }),
  type: z.string().min(1, "El tipo de ubicación es requerido"),
});

export type LocationFormValues = z.infer<typeof LocationFormSchema>;
