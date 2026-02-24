import { z } from "zod";

export const LocationFormSchema = z.object({
  almacen: z.number().min(1, "El almacén es requerido"),
  codigo: z.string().min(1, "El código es requerido"),
  nombre: z.string().min(1, "El nombre de la ubicación es requerido"),
  estatus: z.enum(["Activo", "Inactivo", "Mantenimiento"], {
    message: "El estatus es requerido.",
  }),
});

export type LocationFormValues = z.infer<typeof LocationFormSchema>;
